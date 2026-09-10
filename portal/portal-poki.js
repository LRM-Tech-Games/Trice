/* Trice — Poki adapter.
   Load this BEFORE the main game script (pack-web.sh poki does that):
     <script src="portal-poki.js"></script>
   Docs: https://sdk.poki.dev  ·  you must register the game to get it approved. */
(function(){
  var ready = false, q = [];
  function whenReady(fn){ ready ? fn() : q.push(fn); }

  var s = document.createElement('script');
  s.src = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js';
  s.onload = function(){
    if (!window.PokiSDK){ return; }
    var done = function(){ ready = true; q.forEach(function(f){ try { f(); } catch(e){} }); q = []; };
    try { PokiSDK.init().then(done).catch(done); } catch(e){ done(); }
  };
  s.onerror = function(){ /* offline / blocked — Portal stays effectively no-op */ };
  document.head.appendChild(s);

  window.Portal = {
    init: function(){},
    loadingDone: function(){ whenReady(function(){ PokiSDK.gameLoadingFinished(); }); },
    gameplayStart: function(){ whenReady(function(){ PokiSDK.gameplayStart(); }); },
    gameplayStop: function(){ whenReady(function(){ PokiSDK.gameplayStop(); }); },
    commercialBreak: function(cb){
      if (!ready){ if (cb) cb(); return; }
      try { PokiSDK.commercialBreak().then(function(){ if (cb) cb(); }); }
      catch(e){ if (cb) cb(); }
    },
    rewardedBreak: function(cb){
      if (!ready){ if (cb) cb(false); return; }
      try { PokiSDK.rewardedBreak().then(function(ok){ if (cb) cb(!!ok); }); }
      catch(e){ if (cb) cb(false); }
    },
    rewardsAvailable: function(){ return ready; },
    happyTime: function(){ whenReady(function(){ try { PokiSDK.happyTime(0.8); } catch(e){} }); }
  };
})();
