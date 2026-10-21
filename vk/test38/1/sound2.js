/* sound2.js - sound & music lib (same API as the other games' sound2.js; only the _SND / _GEN tables differ:
   this copy is set up for crimson_deck.html) */

/* ===================================================== SOUND & MUSIC LIB --
   Micro sound lib — SAME API as our other games' sound2.js (Web Audio
   branch), so this whole block is interchangeable between projects:
     _SND table                 named sounds, PRELOADED at start (window.snd_*)
     playSound(snd, vol, music, loop, callback, time, delay) -> SoundHandle
       handle: .play() .stop() .pause() .setVolume(v) .setLoop(v) .isPlaying
     playSoundStopAll(mode)     0=sounds 1=music 2=both (default 2)
     playSoundContinueMusic() / playSoundContinueLoops()
     soundVolume / musicVolume / globalVolume    (window properties)
     audioInit()                alias of the user-gesture unlock
   Additions kept INSIDE the lib (no game code touches audio otherwise):
     _GEN: tiny tone GENERATOR — a missing/broken sound FILE gets a
       generated substitute buffer at PRELOAD time, so playSound itself has
       NO fallbacks and always just plays whatever the sndObj holds
     unknown url strings passed to playSound (e.g. a level's "music1") are
       loaded ON DEMAND and CACHED like the skybox folders (never reloaded)
     proximityVol(base,x,y,rad) distance attenuation helper for effects
     setMusic(sndOrUrl|null)    key-guarded music switcher (no-op when the
       same track is already playing; null stops the music channel)        */
const _SND={   /* crimson_deck: sounds picked from the Bloodworks sources (sounds/), names = what the game calls */
  snd_music:"sounds/game_music.m4a",   /* in-game music (looped via setMusic) */
  snd_pistol:"sounds/pistol.mp3",
  snd_assault:"sounds/assault.mp3",
  snd_uzi:"sounds/uzi.mp3",
  snd_shotgun:"sounds/shotgun.mp3",
  snd_rail:"sounds/railgun.mp3",
  snd_minigun:"sounds/minigun.mp3",
  snd_minigun_start:"sounds/minigun_start.mp3",
  snd_minigun_end:"sounds/minigun_end.mp3",
  snd_flame:"sounds/flame.mp3",
  snd_plasma:"sounds/plasma.mp3",
  snd_plasma_hit:"sounds/plasma_hit.mp3",
  snd_rocket:"sounds/rocket.mp3",
  snd_rocket_hit:"sounds/rocket_hit.mp3",   /* missile_explosion */
  snd_explode:"sounds/explode.mp3",
  snd_pulse:"sounds/pulse.mp3",
  snd_laser:"sounds/laser.mp3",
  snd_laser_pistol:"sounds/laser_pistol.mp3",
  snd_laser_mg:"sounds/laser_mg.mp3",
  snd_ion_cannon:"sounds/ion_cannon.mp3",   /* Bloodworks rainbow gun */
  snd_split:"sounds/split.mp3",
  snd_reload_begin:"sounds/reload_begin.mp3",
  snd_reload_end:"sounds/reload_end.mp3",
  snd_mhit0:"sounds/monster_hit0.mp3",
  snd_mhit1:"sounds/monster_hit1.mp3",
  snd_mhit2:"sounds/monster_hit2.mp3",
  snd_mdie0:"sounds/monster_die0.mp3",
  snd_mdie1:"sounds/monster_die1.mp3",
  snd_mdie2:"sounds/monster_die2.mp3",
  snd_mdie3:"sounds/monster_die3.mp3",
  snd_mdie4:"sounds/monster_die4.mp3",
  snd_mdie5:"sounds/monster_die5.mp3",
  snd_phit1:"sounds/player_hit1.mp3",
  snd_phit2:"sounds/player_hit2.mp3",
  snd_phit3:"sounds/player_hit3.mp3",
  snd_phit4:"sounds/player_hit4.mp3",
  snd_phit5:"sounds/player_hit5.mp3",
  snd_pdie:"sounds/player_die.mp3",
  snd_woosh:"sounds/melee_woosh.mp3",
  snd_levelup:"sounds/level_up.mp3",
  snd_pickup:"sounds/pickup.mp3",   /* Bloodworks shimmer */
  snd_click:"sounds/click.mp3",
  snd_glass1:"sounds/glass1.mp3",   /* Bloodworks frost-laser shatter (lamp hits) */
  snd_glass2:"sounds/glass2.mp3",
  snd_roar:"sounds/roar.mp3",   /* crawler roar: two Bloodworks monster deaths pitched down + echo */
  snd_jump:"sounds/jump.mp3",   /* no file shipped: generated (_GEN) until you drop one in */
  snd_land:"sounds/land.mp3",   /* generated */
  snd_door:"sounds/door.mp3",   /* generated */
  snd_crate:"sounds/crate.mp3",   /* generated */
  snd_heal:"sounds/heal.mp3"   /* generated */
};
/* generated substitutes: [freq, startSec, durSec, wave?] tone lists,
   rendered into REAL buffers at preload only when the FILE is missing. */
const _GEN={
  snd_jump:[[330,0,.05],[520,.04,.09]],
  snd_land:[[160,0,.07,"triangle"],[95,.05,.11,"triangle"]],
  snd_door:[[95,0,.28,"sawtooth"],[70,.12,.3,"sawtooth"],[55,.3,.12,"square"]],
  snd_crate:[[150,0,.1,"square"],[100,.04,.14,"square"],[70,.1,.18,"square"]],
  snd_heal:[[523,0,.07],[659,.07,.07],[784,.14,.07],[1046,.21,.14]]
};

(function(){

  //========== SoundHandle ==========
  function SoundHandle(isMusic){
    this._audio=null;
    this._queue=[];
    this._stopped=false;
    this.baseVol=1;
    this.isMusic=isMusic;
  }
  SoundHandle.prototype._exec=function(fn){
    if(this._audio){
      try{ fn(this._audio); }catch(e){}
    } else if(!this._stopped){
      this._queue.push(fn);
    }
  };
  SoundHandle.prototype._bind=function(audio){
    this._audio=audio;
    while(this._queue.length && !this._stopped){
      try{ this._queue.shift()(audio); }catch(e){}
    }
    this._queue=[];
  };
  SoundHandle.prototype.play=function(){
    this._stopped=false;
    this._exec(function(a){ if(a.play) a.play(); });
    return this;
  };
  SoundHandle.prototype.stop=function(){
    this._stopped=true;
    this._queue=[];
    this._exec(function(a){ if(a.stop) a.stop(); });
    return this;
  };
  SoundHandle.prototype.pause=function(){
    this._exec(function(a){ if(a.pause) a.pause(); });
    return this;
  };
  SoundHandle.prototype.setVolume=function(v){
    this.baseVol=v;
    this._updateVolume();
    return this;
  };
  SoundHandle.prototype._updateVolume=function(){
    var vol=this.isMusic ? _musicVolume : _soundVolume;
    var finalVol=this.baseVol*vol*_globalVolume;
    this._exec(function(a){ if(a.setVolume) a.setVolume(finalVol); });
  };
  SoundHandle.prototype.setLoop=function(v){
    this._exec(function(a){ if(a.setLoop) a.setLoop(v); });
    return this;
  };
  Object.defineProperty(SoundHandle.prototype,'isPlaying',{
    get:function(){
      if(this._stopped) return false;
      if(this._audio && typeof this._audio.isPlaying!=='undefined') return this._audio.isPlaying;
      return !this._stopped && this._audio!==null;
    }
  });

  //========== Globals ==========
  var _soundVolume=1, _musicVolume=1, _globalVolume=1;
  var allHandles=[];
  var soundTimeMap=new Map();
  var activeSounds=[];
  var activeMusic=[];

  //========== Volume Properties ==========
  Object.defineProperty(window,'soundVolume',{
    get:function(){ return _soundVolume; },
    set:function(v){
      _soundVolume=v;
      for(var i=0;i<allHandles.length;i++){
        if(!allHandles[i].isMusic) allHandles[i]._updateVolume();
      }
    }
  });
  Object.defineProperty(window,'musicVolume',{
    get:function(){ return _musicVolume; },
    set:function(v){
      _musicVolume=v;
      for(var i=0;i<allHandles.length;i++){
        if(allHandles[i].isMusic) allHandles[i]._updateVolume();
      }
    }
  });
  Object.defineProperty(window,'globalVolume',{
    get:function(){ return _globalVolume; },
    set:function(v){
      _globalVolume=v;
      for(var i=0;i<allHandles.length;i++) allHandles[i]._updateVolume();
    }
  });
  soundVolume=1;
  musicVolume=0.55;                 /* music sits under the effects by default */
  globalVolume=1;

  //========== Cleanup ==========
  function cleanupHandles(){
    for(var i=allHandles.length-1;i>=0;i--){
      if(allHandles[i]._stopped) allHandles.splice(i,1);
    }
  }

  //========== Web Audio ==========
  var audioCtx=null;
  var pendingQueue=[];
  var soundData={};

  /* DECODE BEFORE THE FIRST GESTURE.
     The context is created IMMEDIATELY. A context built outside a user
     gesture simply starts in state 'suspended' (allowed everywhere,
     iOS included) and decodeAudioData works on it — only PLAYBACK needs
     the unlock, and that is guarded separately in startPlayback().
     This is what makes soundReady() a MONOTONIC predicate: "fetched +
     decoded" can only ever go false -> true. It used to depend on whether
     the player had already tapped, so it flipped true -> false right after
     the tap and the theme gate in gamebody.js (which shares the predicate
     with the preloader) blocked the level AFTER the preloader had already
     handed over. */
  function ensureCtx(){
    if(!audioCtx){
      try{ audioCtx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ audioCtx=null; }
      /* when iOS DOES lift the interruption on its own, recover without a tap */
      if(audioCtx) audioCtx.onstatechange=function(){ if(audioCtx.state==='running') afterResume(); };
    }
    return audioCtx;
  }
  ensureCtx();
  function isContextReady(){          /* PLAYBACK-ready (gesture done) */
    return audioCtx && audioCtx.state==='running';
  }
  function flushPending(){
    while(pendingQueue.length && isContextReady()){
      pendingQueue.shift()();
    }
  }
  // User gesture - ONLY place where context is created/resumed
  /* iOS 18 INTERRUPTION FIX (iPhone 12; iOS 15.7 auto-resumed, so iPhone 6
     never showed this). A screen lock / call puts the context in the WebKit
     state 'interrupted' — NOT 'suspended' — so the old test never fired and
     every later playSound just piled into pendingQueue for the rest of the
     session. Resume on ANY non-running state, and NEVER un-arm the listeners:
     there can be a second, third... interruption. (Un-arming was safe only
     because the old code assumed one single unlock per session.) */
  function onUserGesture(){
    if(!ensureCtx()) return;
    if(audioCtx.state!=='running'){
      try{ audioCtx.resume().then(afterResume, function(){}); }catch(e){}
    } else afterResume();
  }
  function afterResume(){ flushPending(); restoreMusic(); }
  /* an interruption STOPS the live BufferSources: their onended empties
     activeMusic while setMusic's musicKey still names the track, so setMusic()
     stayed a no-op and the music never came back even once sfx worked. */
  function restoreMusic(){
    if(!_musicSnd) return;
    for(var i=0;i<allHandles.length;i++)
      if(allHandles[i].isMusic && !allHandles[i]._stopped) return;   /* still playing or queued */
    playSound(_musicSnd, 0.6, true);
  }
  document.addEventListener('click',onUserGesture);
  document.addEventListener('touchend',onUserGesture);
  document.addEventListener('keydown',onUserGesture);
  window.audioInit=onUserGesture;   /* the game calls audioInit() in its own input handlers too */

  /* render a _GEN tone list into a real AudioBuffer (OfflineAudioContext:
     works BEFORE any user gesture, so substitutes are ready at preload) */
  function genBuffer(def, cb){
    try{
      var dur=0;
      for(var i=0;i<def.length;i++) dur=Math.max(dur, def[i][1]+def[i][2]);
      var sr=22050;
      var oc=new OfflineAudioContext(1, Math.ceil((dur+0.06)*sr), sr);
      for(var i=0;i<def.length;i++){
        var f=def[i][0], dt=def[i][1], d=def[i][2], type=def[i][3];
        var o=oc.createOscillator(), g=oc.createGain();
        o.type=type||"triangle"; o.frequency.value=f;
        g.gain.setValueAtTime(0.0001, dt);
        g.gain.linearRampToValueAtTime(0.22, dt+0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, dt+d);
        o.connect(g); g.connect(oc.destination);
        o.start(dt); o.stop(dt+d+0.03);
      }
      /* LOUDNESS NORMALIZATION: peak-normalize every rendered substitute to
         the SAME level (0.85) — the raw tone envelopes peaked around 0.22
         (and lower when tones didn't overlap), so generated effects like
         snd_jump / snd_land / snd_spike were drowned by the 0.6 music.
         Now every generated sound is equally, clearly audible. */
      oc.startRendering().then(function(buf){
        try{
          var peak=0;
          for(var ch=0;ch<buf.numberOfChannels;ch++){
            var d0=buf.getChannelData(ch);
            for(var j=0;j<d0.length;j++){ var a=Math.abs(d0[j]); if(a>peak) peak=a; }
          }
          if(peak>0.0001){
            var s=0.85/peak;
            for(var ch=0;ch<buf.numberOfChannels;ch++){
              var d1=buf.getChannelData(ch);
              for(var j=0;j<d1.length;j++) d1[j]*=s;
            }
          }
        }catch(e){}
        cb(buf);
      }, function(){ cb(null); });
    }catch(e){ cb(null); }
  }

  /* preload: fetch the FILE; a missing/failed file gets its generated
     substitute rendered right away — playSound never needs fallbacks */
  function settle(sndObj){
    sndObj.pending=false;
    var cbs=sndObj.cbs; sndObj.cbs=[];
    for(var i=0;i<cbs.length;i++) decodeBuffer(sndObj, cbs[i]);
  }
  function loadSound(url, sndObj){
    var fail=function(){
      if(sndObj.gen) genBuffer(sndObj.gen, function(buf){ sndObj.buf1=buf; settle(sndObj); });
      else settle(sndObj);
    };
    try{
      var xhr=new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType='arraybuffer';
      xhr.onload=function(){
        if(xhr.status===200 || xhr.status===0){ sndObj.buf0=xhr.response; settle(sndObj); }
        else fail();
      };
      xhr.onerror=fail;
      xhr.send();
    }catch(e){ fail(); }
  }

  /* decode when the context is ready; a corrupt file also falls back to
     the generated substitute HERE (still not in playSound) */
  function decodeBuffer(sndObj, callback){
    if(sndObj.buf1){ callback(sndObj.buf1); return; }
    if(sndObj.pending){ sndObj.cbs.push(callback); return; }   /* file still in flight */
    if(!sndObj.buf0){ callback(null); return; }
    /* DECODE needs a context OBJECT, not a RUNNING one — see ensureCtx(). */
    if(!ensureCtx()){
      pendingQueue.push(function(){ decodeBuffer(sndObj, callback); });
      return;
    }
    audioCtx.decodeAudioData(sndObj.buf0.slice(0), function(buffer){
      sndObj.buf1=buffer;
      callback(buffer);
    }, function(){
      if(sndObj.gen) genBuffer(sndObj.gen, function(buf){ sndObj.buf1=buf; callback(buf); });
      else callback(null);
    });
  }

  /* preload every _SND entry now */
  function makeSnd(url, gen){
    var sndObj={url:url, buf0:null, buf1:null, pending:true, cbs:[], gen:gen||null};
    soundData[url]=sndObj;
    loadSound(url, sndObj);
    return sndObj;
  }
  for(var key in _SND) window[key]=makeSnd(_SND[key], _GEN[key]);

  /* unknown url string (e.g. a level json "music1") -> load once, CACHED */
  function getSnd(snd){
    if(typeof snd!=='string') return snd;
    return soundData[snd] || makeSnd(snd, null);
  }

  window.playSound=function(snd, vol, music, loop, callback, time, delay){
    vol=(vol!==undefined)?vol:1;
    music=!!music;
    loop=(loop===undefined)?music:!!loop;   /* music loops by default; explicit false wins */
    delay=(delay!==undefined)?delay:50;

    var handle=new SoundHandle(music);
    handle.baseVol=vol;
    allHandles.push(handle);

    var sndObj=getSnd(snd);
    if(!sndObj){
      cleanupHandles();
      return handle;
    }

    var playTime=Date.now();
    if(soundTimeMap.get(sndObj) && (playTime-soundTimeMap.get(sndObj)<delay)) return handle;
    soundTimeMap.set(sndObj, playTime);

    var channel=music?activeMusic:activeSounds;
    if(channel.stopFlag && time && time<channel.stopFlag) return handle;

    if(callback) callback();

    var startPlayback=function(buffer){
      if(!buffer || handle._stopped) return;
      if(!isContextReady()){
        pendingQueue.push(function(){ startPlayback(buffer); });
        return;
      }
      var source=audioCtx.createBufferSource();
      source.buffer=buffer;
      source.loop=loop;

      var gain=audioCtx.createGain();
      source.connect(gain);
      gain.connect(audioCtx.destination);

      var playing=true;
      var wrapper={
        _source:source,
        _gain:gain,
        play:function(){},
        stop:function(){
          playing=false;
          try{ source.stop(); }catch(e){}
        },
        pause:function(){},
        setVolume:function(v){ gain.gain.value=v; },
        setLoop:function(v){ source.loop=v; },
        get isPlaying(){ return playing; }
      };

      handle._bind(wrapper);
      channel.push(handle);
      handle._updateVolume();

      source.start(0);

      source.onended=function(){
        playing=false;
        var idx=channel.indexOf(handle);
        if(idx!==-1) channel.splice(idx,1);
        var hidx=allHandles.indexOf(handle);
        if(hidx!==-1) allHandles.splice(hidx,1);
      };
    };

    decodeBuffer(sndObj, startPlayback);

    cleanupHandles();
    return handle;
  };

  //========== Common Functions ==========
  window.playSoundStopAll=function(mode){
    mode=(mode!==undefined)?mode:2;
    if(mode===0 || mode===2){
      activeSounds.stopFlag=Date.now();
      var sounds=activeSounds.slice();
      for(var i=0;i<sounds.length;i++) sounds[i].stop();
      activeSounds.length=0;
    }
    if(mode===1 || mode===2){
      activeMusic.stopFlag=Date.now();
      var musics=activeMusic.slice();
      for(var i=0;i<musics.length;i++) musics[i].stop();
      activeMusic.length=0;
      /* SUSPENDED-CONTEXT FIX: a music handle whose playback is still
         QUEUED behind a locked AudioContext is not in activeMusic yet and
         was missed here — after the unlock the OLD track (intro) started
         on top of the new one. Stop every unbound music handle too;
         startPlayback checks handle._stopped, so the queued start aborts. */
      for(var i=0;i<allHandles.length;i++)
        if(allHandles[i].isMusic && !allHandles[i]._audio) allHandles[i].stop();
    }
    cleanupHandles();
  };
  window.playSoundContinueMusic=function(){
    for(var i=0;i<activeMusic.length;i++){
      var h=activeMusic[i];
      h.setLoop(true);
      h.play();
      h._updateVolume();
    }
  };
  window.playSoundContinueLoops=function(){
    if(_soundVolume===0) return;
    for(var i=0;i<activeSounds.length;i++){
      var h=activeSounds[i];
      if(h._audio && h._audio._source && h._audio._source.loop){
        h.setLoop(true);
        h.play();
      }
    }
  };

  //========== game helpers (still audio-only, kept inside the lib) ==========
  /* volume of an effect emitted AT (x,y): 100% within 1 cell of the player,
     falling LINEARLY to 20% at `rad` cells and staying at 20% beyond */
  window.proximityVol=function(base, x, y, rad){
    var p=(typeof game!=="undefined" && game)?game.player1:null;
    if(!p) return base;
    var d=Math.hypot(p.position[0]-x, p.position[1]-y);
    var f=Math.min(1, Math.max(0, 1-(d-1)/(rad-1)));
    return base*(0.2+0.8*f);
  };
  /* THE ONE PRELOAD PREDICATE: true once a sound is FULLY play-ready — file
     fetched AND decoded into an AudioBuffer, so playSound starts it with
     ZERO delay. Passing an unknown url string STARTS the fetch and, once the
     file is in, the DECODE. A missing or corrupt file settles too (silence),
     so this can never hang, and thanks to the eagerly created context it no
     longer depends on the user gesture — it is MONOTONIC.
     Used BOTH by the engine preloader bar and by the "Get ready…" theme gate
     (gamebody.js); those two MUST share the same predicate. */
  window.soundReady=function(snd){
    if(!snd) return true;
    var o=getSnd(snd);
    if(!o || o.pending) return false;       /* file still fetching */
    if(o.buf1) return true;                 /* decoded -> fully ready */
    if(!o.buf0 && !o.gen) return true;      /* failed fetch, no substitute -> silence */
    if(!o._preDecode){                      /* decode NOW (once); waits for the
                                               audio context unlock internally */
      o._preDecode=true;
      decodeBuffer(o, function(){ o._preSettled=true; });
    }
    return !!o.buf1 || !!o._preSettled;     /* _preSettled also covers a corrupt file */
  };
  /* key-guarded music switcher: setMusic(sndObj | url | null).
     Same track already playing -> no-op (deaths / editor resets never
     restart the music); null -> stop the music channel (before jingles). */
  var musicKey, _musicSnd=null;   /* _musicSnd: what restoreMusic() re-starts */
  window.setMusic=function(snd){
    var key=snd?((typeof snd==="string")?snd:snd.url):null;
    if(key===musicKey) return;
    musicKey=key; _musicSnd=snd||null;
    playSoundStopAll(1);
    if(snd) playSound(snd, 0.6, true);          /* music: loops by default */
  };
})();
/* =================================================== end SOUND & MUSIC --- */