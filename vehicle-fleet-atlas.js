// Measured image boundaries: AI atlases retain layout but row edges vary slightly.
export const atlasLayouts={
 'ford-taunus-12m-1968':{rows:[[0,.221],[.227,.438],[.444,.712]],bottom:.718,columns:[0,.25,.50,.75,1],reverseRight:true},
 'daewoo-matiz-2003':{rows:[[0,.242],[.248,.489],[.497,.739]],bottom:.748,columns:[0,.25,.50,.75,1]},
 'volvo-v70-wagon-2006':{rows:[[0,.239],[.25,.49],[.506,.751]],bottom:.76,columns:[0,.286,.532,.775,1]},
 'willys-mb':{rows:[[.004,.28],[.241,.508],[.51,.721]],sideX:[[.064,.908],[.026,.95]],bottom:.735,end:.976,columns:[0,.251,.50,.75,1],reverseRight:true},
 'ford-f-100-1956':{rows:[[0,.226],[.233,.448],[.476,.714]],bottom:.726,columns:[0,.25,.5,.748,1],reverseRight:true},
 'citroen-hy-1957':{rows:[[0,.245],[.254,.494],[.507,.712]],bottom:.723,columns:[0,.252,.505,.752,1],reverseRight:true},
 'nissan-civilian':{rows:[[0,.249],[.255,.502],[.508,.733]],bottom:.74,columns:[0,.25,.50,.75,1],reverseRight:true,frontEnd:.10,roofStart:.18,
  // Front glass aligned to the side-window band; retain the lamps below 1.10 m.
  frontWindow:{bottom:1.38,top:2.30,uvBottom:.425,uvTop:.045,lowerBlend:1.10}},
 'daihatsu-gran-max-box-van':{rows:[[0,.244],[.252,.493],[.506,.730]],bottom:.738,columns:[0,.25,.50,.75,1]},
 'nissan-silvia-s14-1994':{rows:[[0,.232],[.243,.459],[.476,.744]],bottom:.752,columns:[0,.289,.578,.81,1],reverseRight:true},
 'mahindra-thar-2021':{rows:[[0,.244],[.252,.493],[.504,.744]],bottom:.75,columns:[0,.249,.5,.748,1]}
};
