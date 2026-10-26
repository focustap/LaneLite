use serde::Serialize;
use serde_json::Value;
use std::{collections::BTreeMap,fs,path::PathBuf,time::Duration};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct Rank { tier:String, division:String, lp:i64, wins:i64, losses:i64 }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Snapshot {
    connected:bool,
    status:String,
    account:Option<String>,
    game_name:Option<String>,
    phase:String,
    champion_id:Option<i64>,
    locked:bool,
    role:Option<String>,
    queue_id:Option<i64>,
    game_id:Option<String>,
    ranked:BTreeMap<String, Rank>,
    enemy_champion_ids:Vec<i64>,
    enemy_sync_status:String,
}

fn find_lockfile(custom: Option<&str>) -> Option<PathBuf> {
    let mut paths=Vec::new();
    if let Some(dir)=custom.filter(|x| !x.trim().is_empty()) {
        paths.push(PathBuf::from(dir.trim()).join("lockfile"));
    } else {
        for letter in ["C", "D", "E", "F"] {
            paths.push(PathBuf::from(format!(r"{}:\Riot Games\League of Legends\lockfile",letter)));
        }
        paths.push(PathBuf::from(r"C:\Program Files\Riot Games\League of Legends\lockfile"));
    }
    paths.into_iter().find(|p| p.is_file())
}

fn parse_lockfile(contents: &str) -> Option<(u16,String)> {
    // LeagueClient:<pid>:<port>:<password>:https
    let parts:Vec<_>=contents.trim().split(':').collect();
    if parts.len()!=5 || parts[0]!="LeagueClient" || parts[4]!="https" { return None; }
    let port=parts[2].parse::<u16>().ok()?;
    if port==0 || parts[3].is_empty() {return None;}
    Some((port,parts[3].to_string()))
}

async fn lcu(client:&reqwest::Client, port:u16, pass:&str, route:&str) -> Option<Value> {
    // Constant endpoint paths; requests stay on this machine. Credentials never enter JS.
    let url=format!("https://127.0.0.1:{port}{route}");
    let response=client.get(url).basic_auth("riot",Some(pass)).send().await.ok()?;
    if !response.status().is_success() {return None;}
    response.json::<Value>().await.ok()
}

fn read_rank(value:&Value) -> Option<Rank> {
    Some(Rank{
        tier:value.get("tier")?.as_str()?.to_owned(),
        division:value.get("division")?.as_str()?.to_owned(),
        lp:value.get("leaguePoints")?.as_i64()?,
        wins:value.get("wins")?.as_i64()?,
        losses:value.get("losses")?.as_i64()?,
    })
}

/// Return only opponents from draft queues where enemy picks are meant to be visible.
/// Never use pickIntent or hidden / unrevealed game-mode data.
fn known_enemy_picks(session:&Value, queue_id:Option<i64>) -> (Vec<i64>,String) {
    // Normal Draft, Ranked Solo, Ranked Flex, Clash draft. No blind/ARAM/unknown queues.
    if !matches!(queue_id,Some(400|420|440|700)) {
        return (Vec::new(),"Auto-sync only in visible draft queues".into());
    }
    let Some(team)=session.get("theirTeam").and_then(Value::as_array)
        .or_else(||session.get("enemyTeam").and_then(Value::as_array)) else {
        return (Vec::new(),"Waiting for enemy draft data".into());
    };
    let completed:std::collections::HashSet<i64>=session.get("actions")
        .and_then(Value::as_array).into_iter().flatten()
        .filter_map(Value::as_array).flatten()
        .filter(|a|a.get("type").and_then(Value::as_str)==Some("pick") &&
            a.get("completed").and_then(Value::as_bool)==Some(true))
        .filter_map(|a|a.get("actorCellId").and_then(Value::as_i64))
        .collect();
    let mut seen=std::collections::HashSet::new();
    let picks=team.iter().take(5).map(|member|{
        let id=member.get("championId").and_then(Value::as_i64).unwrap_or(0);
        let cell=member.get("cellId").and_then(Value::as_i64);
        if id<=0 || !seen.insert(id) {return 0;}
        // Only completed picks, never hover/intents. If an action is available for the
        // enemy cell but not completed, withhold that champion.
        let enemy_has_pick_action=cell.map(|c|session.get("actions")
            .and_then(Value::as_array).into_iter().flatten()
            .filter_map(Value::as_array).flatten().any(|a|{
                a.get("type").and_then(Value::as_str)==Some("pick") &&
                a.get("actorCellId").and_then(Value::as_i64)==Some(c)
            })).unwrap_or(false);
        if enemy_has_pick_action && !cell.map(|c|completed.contains(&c)).unwrap_or(false) {0} else {id}
    }).collect::<Vec<_>>();
    (picks,"Visible locked draft picks only".into())
}

#[tauri::command]
async fn league_snapshot(install_dir:Option<String>) -> Snapshot {
    let mut snap=Snapshot{
        connected:false,status:"League not detected".into(),account:None,game_name:None,
        phase:"None".into(),champion_id:None,locked:false,role:None,
        queue_id:None,game_id:None,ranked:BTreeMap::new(),
        enemy_champion_ids:Vec::new(),enemy_sync_status:"Waiting for visible draft picks".into(),
    };
    let Some(path)=find_lockfile(install_dir.as_deref()) else {return snap;};
    let Some((port,pass))=fs::read_to_string(path).ok().and_then(|s| parse_lockfile(&s)) else {
        snap.status="League lockfile invalid or inaccessible".into();return snap;
    };
    // Riot's client uses a self-signed HTTPS cert. ONLY call hardcoded localhost URLs.
    let Ok(client)=reqwest::Client::builder().timeout(Duration::from_secs(3))
        .danger_accept_invalid_certs(true).build() else {return snap;};
    let (player,phase,session,ranks,select)=tokio::join!(
        lcu(&client,port,&pass,"/lol-summoner/v1/current-summoner"),
        lcu(&client,port,&pass,"/lol-gameflow/v1/gameflow-phase"),
        lcu(&client,port,&pass,"/lol-gameflow/v1/session"),
        lcu(&client,port,&pass,"/lol-ranked/v1/current-ranked-stats"),
        lcu(&client,port,&pass,"/lol-champ-select/v1/session"),
    );
    if phase.is_none() && player.is_none() {
        snap.status="League running, API not responding".into();return snap;
    }
    snap.connected=true;
    snap.status="Connected to local League client".into();
    snap.phase=phase.and_then(|v|v.as_str().map(str::to_owned)).unwrap_or_else(||"None".into());
    if let Some(p)=player {
        snap.account=p.get("puuid").and_then(Value::as_str).map(str::to_owned);
        snap.game_name=p.get("gameName").and_then(Value::as_str).map(str::to_owned);
    }
    if let Some(v)=session {
        snap.queue_id=v.pointer("/gameData/queue/id").and_then(Value::as_i64)
            .or_else(||v.pointer("/gameData/queueId").and_then(Value::as_i64));
        snap.game_id=v.pointer("/gameData/gameId").and_then(|x|if let Some(s)=x.as_str(){if s!="0" && !s.is_empty(){Some(s.to_owned())}else{None}}else{x.as_i64().filter(|n|*n>0).map(|n|n.to_string())});
    }
    if let Some(v)=ranks {
        let map=v.get("queueMap");
        for (name,queue) in [("solo","RANKED_SOLO_5x5"),("flex","RANKED_FLEX_SR")] {
            if let Some(r)=map.and_then(|m|m.get(queue)).and_then(read_rank) {
                snap.ranked.insert(name.to_owned(),r);
            }
        }
    }
    if let Some(s)=select {
        let (enemies, label)=known_enemy_picks(&s,snap.queue_id);
        snap.enemy_champion_ids=enemies;
        snap.enemy_sync_status=label;
        let local=s.get("localPlayerCellId").and_then(Value::as_i64);
        if let Some(local_cell)=local {
            if let Some(our)=s.get("myTeam").and_then(Value::as_array)
                .and_then(|team|team.iter().find(|x|x.get("cellId").and_then(Value::as_i64)==Some(local_cell))) {
                snap.champion_id=our.get("championId").and_then(Value::as_i64).filter(|n|*n>0);
                snap.role=our.get("assignedPosition").and_then(Value::as_str).map(str::to_owned);
            }
            snap.locked=s.get("actions").and_then(Value::as_array).map(|rounds| rounds.iter().any(|round| {
                round.as_array().map(|actions|actions.iter().any(|action|
                    action.get("type").and_then(Value::as_str)==Some("pick") &&
                    action.get("actorCellId").and_then(Value::as_i64)==Some(local_cell) &&
                    action.get("completed").and_then(Value::as_bool)==Some(true)
                )).unwrap_or(false)
            })).unwrap_or(false);
        }
    }
    snap
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn only_visible_draft_picks() {
        let example=serde_json::json!({"theirTeam":[{"cellId":1,"championId":233}, {"cellId":2,"championId":266}, {"cellId":3,"championId":0}],
            "actions":[[{"type":"pick","actorCellId":1,"completed":true},{"type":"pick","actorCellId":2,"completed":false}]]});
        assert_eq!(known_enemy_picks(&example,Some(420)).0,vec![233,0,0]);
        assert!(known_enemy_picks(&example,Some(450)).0.is_empty());
        assert!(known_enemy_picks(&example,None).0.is_empty());
    }
    #[test] fn lockfile_parser() {
        assert_eq!(parse_lockfile("LeagueClient:123:54321:secret:https"),Some((54321,"secret".into())));
        assert_eq!(parse_lockfile("bad:123:54321:secret:https"),None);
        assert_eq!(parse_lockfile("LeagueClient:123:54321:secret:http"),None);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![league_snapshot])
        .run(tauri::generate_context!())
        .expect("error while running LaneLite");
}
