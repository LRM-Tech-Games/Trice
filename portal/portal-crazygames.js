/* Trice — CrazyGames adapter.
   Load this BEFORE the main game script (pack-web.sh crazygames does that):
     <script src="portal-crazygames.js"></script>
   Docs: https://docs.crazygames.com  ·  submit via the CrazyGames developer portal. */
(function(){
  var SDK = null;

  var s = document.createElement('script');
  s.src = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
  s.onload = function(){
    if (!(window.CrazyGames && window.CrazyGames.SDK)) return;
    try {
      window.CrazyGames.SDK.init().then(function(){ SDK = window.CrazyGames.SDK; }).catch(function(){});
    } catch(e){}
  };
  s.onerror = function(){ /* offline / blocked — Portal stays effectively no-op */ };
  document.head.appendChild(s);

  function requestAd(kind, cb, okOnFinish){
    if (!SDK){ if (cb) cb(okOnFinish ? false : undefined); return; }
    try {
      SDK.ad.requestAd(kind, {
        adFinished: function(){ if (cb) cb(okOnFinish ? true : undefined); },
        adError:    function(){ if (cb) cb(okOnFinish ? false : undefined); }
      });
    } catch(e){ if (cb) cb(okOnFinish ? false : undefined); }
  }

  window.Portal = {
    init: function(){ try { if (SDK) SDK.game.loadingStart(); } catch(e){} },
    loadingDone: function(){ try { if (SDK) SDK.game.loadingStop(); } catch(e){} },
    gameplayStart: function(){ try { if (SDK) SDK.game.gameplayStart(); } catch(e){} },
    gameplayStop: function(){ try { if (SDK) SDK.game.gameplayStop(); } catch(e){} },
    commercialBreak: function(cb){ requestAd('midgame', cb, false); },
    rewardedBreak: function(cb){ requestAd('rewarded', cb, true); },
    rewardsAvailable: function(){ return !!SDK; },
    happyTime: function(){ try { if (SDK) SDK.game.happytime(); } catch(e){} }
  };
})();
