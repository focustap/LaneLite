// LaneLite verified core-build snapshots from public OP.GG champion build pages.
// These are jointly sampled THREE-item build paths (not simulated 6-item win rates).
// Captured: 2026-10-26, patch 16.21, ranked Solo/Duo, Emerald+, All Servers.
// Numeric rates/samples are fixed until manually refreshed; never label them live.
// Do not extend this file with personal theorycraft builds or one-item "fourth" swaps.
const snapshot = {
  'Briar/Jungle': {
    boots:"Plated Steelcaps",
    cores:[
      {label:'Crit burst',items:['The Collector','Titanic Hydra',"Lord Dominik's Regards"],games:3927,winRate:54.44},
      {label:'Titanic bruiser',items:['Titanic Hydra','Black Cleaver',"Death's Dance"],games:3087,winRate:58.05},
      {label:'On-hit bruiser',items:['Blade of The Ruined King','Black Cleaver',"Death's Dance"],games:1423,winRate:59.10}
    ]
  },
  'Amumu/Jungle': {
    boots:"Plated Steelcaps",
    cores:[
      {label:'Magic-resist tank',items:["Liandry's Torment",'Sunfire Aegis','Abyssal Mask'],games:2432,winRate:58.55},
      {label:'Anti-heal tank',items:["Liandry's Torment",'Sunfire Aegis','Thornmail'],games:1413,winRate:54.64},
      {label:'Durable tank',items:["Liandry's Torment",'Sunfire Aegis',"Jak'Sho, The Protean"],games:580,winRate:57.24}
    ]
  },
  'Lillia/Jungle': {
    boots:"Sorcerer's Shoes",
    cores:[
      {label:'Damage + stasis',items:["Liandry's Torment",'Riftmaker',"Zhonya's Hourglass"],games:10526,winRate:52.29},
      {label:'Control / slow',items:["Liandry's Torment",'Riftmaker',"Rylai's Crystal Scepter"],games:2875,winRate:52.42},
      {label:'Stasis + slow',items:["Liandry's Torment","Rylai's Crystal Scepter","Zhonya's Hourglass"],games:1356,winRate:50.00}
    ]
  },
  'Warwick/Jungle': {
    boots:"Plated Steelcaps",
    cores:[
      {label:'Fighter',items:['Stridebreaker','Blade of The Ruined King',"Death's Dance"],games:1510,winRate:57.22},
      {label:'Magic resist',items:['Stridebreaker','Blade of The Ruined King','Spirit Visage'],games:1037,winRate:53.91},
      {label:'Anti-heal',items:['Stridebreaker','Blade of The Ruined King','Thornmail'],games:990,winRate:53.43}
    ]
  },
  'Sylas/Mid': {
    boots:"Sorcerer's Shoes",
    cores:[
      {label:'Sustain mage',items:['Hextech Rocketbelt','Riftmaker',"Zhonya's Hourglass"],games:6279,winRate:49.93},
      {label:'Burst mage',items:['Hextech Rocketbelt','Shadowflame',"Zhonya's Hourglass"],games:3845,winRate:50.17},
      {label:'Lich Bane mage',items:['Lich Bane','Shadowflame',"Zhonya's Hourglass"],games:1121,winRate:50.85}
    ]
  }
};
export const VERIFIED_CORE_PATCH='16.21';
export const VERIFIED_CORE_CAPTURED='2026-10-26';
export const VERIFIED_CORE_SCOPE='Emerald+ · Ranked Solo/Duo · All Servers';
export function getVerifiedCoreBuilds(champion, role) {
  const result=snapshot[`${champion}/${role}`];
  if(!result)return null;
  const slug=champion.toLowerCase().replace(/[^a-z0-9]/g,'');
  const lane=role.toLowerCase()==='bot'?'adc':role.toLowerCase();
  return {
    patch:VERIFIED_CORE_PATCH, captured:VERIFIED_CORE_CAPTURED, scope:VERIFIED_CORE_SCOPE,
    source:`https://op.gg/lol/champions/${slug}/build/${lane}`,
    boots:result.boots,
    cores:result.cores.map(core=>({...core,items:[...core.items]}))
  };
}
