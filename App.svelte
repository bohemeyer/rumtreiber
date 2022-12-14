<script>
  import { onMount, onDestroy } from "svelte";
  import { writable } from "svelte/store";
  import Store from "./store.js";
  import Artyom from "artyom.js";
  import { supabase } from "./supabaseClient";

  let places = {
    home: {
      top: 52.494643,
      bottom: 52.494411,
      left: 13.432816,
      right: 13.43324
    }
  };

  let _geoWatch;

  let access = true;
  let current_user = false;

  let user = window.location.search.replace("?", "");

  console.log(user);

  const Login = async () => {
    const { data, error, status } = await supabase
      .from("rumtreibers")
      .select("id,name,position,lastseen")
      .eq("slug", user)
      .single();
    if (data) current_user = data;
  };

  Login();

  async function writePositionToDB(lat, long) {
    console.log("speichern");
    if (current_user) {
      current_user.position = lat + ";" + long;
      current_user.lastseen = new Date().toISOString();
      let { error } = await supabase.from("rumtreibers").upsert(current_user);
      //alert(JSON.stringify(error));
    }
  }

  function distance(lon1, lat1, lon2, lat2) {
    var R = 6371; // Radius of the earth in km
    var dLat = (lat2 - lat1).toRad(); // Javascript functions in radians
    var dLon = (lon2 - lon1).toRad();
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1.toRad()) *
        Math.cos(lat2.toRad()) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d * 1000; // Distance in m
  }

  /** Converts numeric degrees to radians */
  if (typeof Number.prototype.toRad === "undefined") {
    Number.prototype.toRad = function() {
      return (this * Math.PI) / 180;
    };
  }

  const artyom = new Artyom();
  var commands = [
    {
      indexes: ["ein Tunichtgut bin"],
      action: function() {
        access = true;
        console.log("Haus");
      }
    },
    {
      indexes: ["Unheil angerichtet"],
      action: function() {
        access = false;
      }
    }
  ];

  artyom.addCommands(commands);

  function startContinuousArtyom() {
    artyom.fatality();

    //setTimeout(function() {
    artyom
      .initialize({
        lang: "de-DE",
        continuous: true,
        listen: true,
        speed: 1
      })
      .then(function() {
        console.log("Ready to work !");
      });
    //}, 250);
  }

  startContinuousArtyom();

  onMount(() => {
    const el = document.querySelector(".map-base");
    if (!el) return;
    el.scrollIntoView({
      //behavior: 'smooth'
      duration: 1000,
      block: "nearest",
      inline: "center"
    });

    if (navigator.geolocation) {
      //access = true;

      const setGeo = p => {
        Store.update(g => ({
          ...g,
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          distance: distance(
            p.coords.latitude,
            p.coords.longitude,
            52.494589692163004,
            13.432924714966603
          )
        }));
        writePositionToDB(p.coords.latitude, p.coords.longitude);
      };
      const settings = {
        enableHighAccuracy: true,
        timeout: 1000,
        maximumAge: Infinity
      };
      const _geoWatch = navigator.geolocation.watchPosition(
        setGeo,
        console.error,
        settings
      );
    } else {
      Store.set(false);
    }
  });
  onDestroy(() => {
    if (_geoWatch) {
      navigator.geolocation.clearWatch(_geoWatch);
    }
  });

  //get initial rumtreibers

  let rumtreibers = [];

  async function loadRumtreibers() {
    const { data, error, status } = await supabase
      .from("rumtreibers")
      .select("id,name,position,lastseen");
    //ADD: wo lastsee größer als letzte 10 minuten .gt("slug", user)
    if (data) rumtreibers = data;
  }

  loadRumtreibers();

  const testi = supabase
    .channel("custom-update-channel")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "rumtreibers" },
      payload => {
        console.log("Change received!", payload);
      }
    )
    .subscribe();

  const subscription = supabase
    .channel("custom-update-channel")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "rumtreibers" },
      e => {
        // e.evenType
        // e.new
        // e.old
        console.log("geändert");
        let obj = rumtreibers.find((r, i) => {
          if (r.id === e.new.id) {
            rumtreibers[i] = e.new;
          }
        });
      }
    )
    .subscribe();

  $: rumtreibers.forEach((rumtreiber, i) => {
    if (rumtreiber.position) {
      var hori = rumtreiber.position.split(";")[1];
      var verti = rumtreiber.position.split(";")[0];

      rumtreibers[i]["left"] =
        ((hori - places.home.left) / (places.home.right - places.home.left)) *
        100;
      rumtreibers[i]["top"] =
        ((places.home.top - verti) / (places.home.top - places.home.bottom)) *
        100;
    }
  });
</script>

<style>
  body {
    background: #222;
    font-family: "Comfortaa", sans-serif;
  }

  aside.context {
    text-align: center;
    color: #fff;
    line-height: 1.7;
  }
  aside.context a {
    text-decoration: none;
    color: #fff;
    padding: 3px 0;
    border-bottom: 1px dashed;
  }
  aside.context a:hover {
    border-bottom: 1px solid;
  }
  aside.context .explanation {
    max-width: 700px;
    margin: 6em auto 0;
  }

  footer {
    text-align: center;
    margin: 4em auto;
    width: 100%;
  }
  footer a {
    text-decoration: none;
    display: inline-block;
    width: 45px;
    height: 45px;
    border-radius: 50%;
    background: transparent;
    border: 1px dashed #fff;
    color: #fff;
    margin: 5px;
  }
  footer a:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  footer a .icons {
    margin-top: 12px;
    display: inline-block;
    font-size: 20px;
  }

  .main-content {
    text-align: center;
    margin: 8em auto;
  }

  .map-base {
    width: 306px;
    height: 600px;
    margin: auto;
    background: url("https://meowlivia.s3.us-east-2.amazonaws.com/codepen/map/9.png")
      center center/cover;
    position: relative;
    display: inline-block;
  }

  .map-flap {
    transform-style: preserve-3d;
    position: absolute;
    width: 100%;
    height: 25%;
    margin: auto;
    left: 0;
    right: 0;
    transition: 0.5s ease;
    top: 25%;
  }
  .map-flap__front,
  .map-flap__back {
    backface-visibility: hidden;
    width: 100%;
    height: 100%;
    position: absolute;
  }
  .map-flap__back {
    transform: scale(-1) rotateY(180deg);
  }
  .map-flap.flap--1 {
    box-shadow: 0 -1px 6px rgba(97, 83, 73, 0.5);
  }
  .map-flap.flap--1 .map-flap__front {
    background: url("https://meowlivia.s3.us-east-2.amazonaws.com/codepen/map/mini-1.png")
      center left/cover;
  }
  .map-flap.flap--1 .map-flap__back {
    background: url("https://meowlivia.s3.us-east-2.amazonaws.com/codepen/map/mini-3.png") -3px
      0 / cover;
  }
  .map-flap.flap--2 {
    box-shadow: 0 1px 6px rgba(97, 83, 73, 0.5);
    top: 50%;
  }
  .map-flap.flap--2 .map-flap__front {
    background: url("https://meowlivia.s3.us-east-2.amazonaws.com/codepen/map/mini-2.png")
      center left/cover;
  }
  .map-flap.flap--2 .map-flap__back {
    background: url("https://meowlivia.s3.us-east-2.amazonaws.com/codepen/map/mini-4.png") -3px
      0 / cover;
  }

  .map-side {
    height: 600px;
    width: 152px;
    position: absolute;
    transform-style: preserve-3d;
    transition: 0.3s ease;
  }
  .map-side .front,
  .map-side .back {
    width: 100%;
    height: 100%;
    position: absolute;
    background-repeat: no-repeat;
    background-position: left top;
    background-size: cover;
    background-image: var(--image);
    backface-visibility: hidden;
  }
  .map-side .back {
    background-image: url(https://meowlivia.s3.us-east-2.amazonaws.com/codepen/map/back.png);
  }

  .map-side {
    top: 0;
  }
  .map-side.side-1 {
    left: 0;
    margin-left: 1.5px;
  }
  .map-side.side-2 {
    left: 50%;
    margin-left: -2px;
  }
  .map-side.side-3 {
    left: 0;
    margin-left: 3px;
  }
  .map-side.side-3 .back {
    transform: rotateY(180deg);
  }
  .map-side.side-4 {
    left: 50%;
    margin-left: -1px;
  }
  .map-side.side-4 .back {
    transform: rotateY(180deg);
  }
  .map-side.side-5 {
    left: 0;
  }
  .map-side.side-5 .back {
    background-image: url(https://meowlivia.s3.us-east-2.amazonaws.com/codepen/map/1.png);
  }
  .map-side.side-6 {
    left: 50%;
  }
  .map-side.side-6 .front {
    background-size: 99.5%;
  }
  .map-side.side-6 .back {
    background-image: url(https://meowlivia.s3.us-east-2.amazonaws.com/codepen/map/17.png);
  }

  .scroll-name {
    position: absolute;
    bottom: 105px;
    left: -60px;
    width: 150px;
    height: 30px;
    font: 15px Satisfy, cursive;
    text-align: center;
    background: url("https://meowlivia.s3.us-east-2.amazonaws.com/codepen/map/scroll.svg")
      center center/cover;
    z-index: 10;
    color: #615349;
    cursor: default;
    opacity: 0;
  }
  .scroll-name p {
    display: inline-block;
    margin: 4px 0 0 15px;
  }

  .footstep {
    position: absolute;
    background: #615349;
    width: 6px;
    height: 12px;
    border-radius: 80% 80% 70% 70%/130% 130% 25% 25%;
    z-index: 10;
    opacity: 0;
  }
  .footstep:before {
    content: "";
    position: absolute;
    border-radius: 6px;
    width: 5px;
    height: 5px;
    top: 110%;
    left: 0px;
    background: #615349;
    border-radius: 0 0 100% 100%;
  }
  .footstep.left {
    transform: rotate(5deg);
  }
  .footstep.right {
    transform: rotate(-3deg) translateY(15px) translateX(10px);
  }

  .footsteps-1 .footstep.left {
    bottom: 150px;
    left: 18px;
    transform: rotate(35deg);
  }
  .footsteps-1 .footstep.right {
    bottom: 150px;
    left: 28px;
    transform: rotate(30deg);
  }

  .footsteps-2 .footstep.left {
    bottom: 285px;
    left: 280px;
    transform: rotate(-90deg);
  }
  .footsteps-2 .footstep.right {
    bottom: 275px;
    left: 285px;
    transform: rotate(-85deg);
  }
  .footsteps-2 .scroll-name {
    bottom: 300px;
    left: 220px;
  }

  .instructions {
    text-align: center;
    color: #fff;
  }
  .instructions p {
    margin-bottom: 8px;
    line-height: 1.3;
  }

  .toggle-map {
    border: 2px solid;
    margin: 30px auto 0;
    background: transparent;
    font: 34px "Lobster Two", cursive;
    padding: 8px 30px;
    cursor: pointer;
    position: relative;
    color: #fff;
  }
  .toggle-map:before {
    content: "";
    position: absolute;
    width: calc(100% - 8px);
    height: 51px;
    left: 2px;
    top: 2px;
    border: 2px solid;
  }
  .toggle-map:hover:before {
    width: 100%;
    height: 100%;
    transition: 0.3s ease;
    left: -2px;
    top: -2px;
    right: auto;
  }
  .toggle-map:focus {
    outline: none;
  }

  .map-base.active .flap--1 {
    transform: rotateX(180deg);
    transform-origin: top center;
    transition: 0.6s transform 1.5s;
  }
  .map-base.active .flap--2 {
    transform: rotateX(180deg);
    transform-origin: bottom center;
    transition: 0.6s transform 1.8s;
  }
  .map-base.active .side-1 {
    transform-origin: center left;
    transform: rotateY(180deg) skewY(2deg);
    transition: 0.5s all ease-in-out 0.6s;
  }
  .map-base.active .side-1 .front {
    transform: rotateY(180deg);
  }
  .map-base.active .side-2 {
    transform: rotateY(180deg) skewY(-2deg);
    transform-origin: center right;
    transition: 0.5s all ease-in-out 0.6s;
  }
  .map-base.active .side-2 .front {
    transform: rotateY(180deg);
  }
  .map-base.active .side-3 {
    left: -50%;
    transform: skewY(2deg) translateX(-100%);
    top: 8px;
    transition: 0.5s transform ease 0.8s, 0.3s left ease 0.8s, 0.5s top ease 0.8s;
  }
  .map-base.active .side-4 {
    left: 100%;
    transform: skewY(-2deg) translateX(100%);
    top: 8px;
    margin-left: -7px;
    transition: 0.5s transform ease 0.8s, 0.3s left ease 0.8s, 0.5s top ease 0.8s,
      0.5s margin ease 0.8s;
  }
  .map-base.active .side-5 {
    left: -100%;
    transform-origin: center left;
    transform: rotateY(180deg);
    transition: 0.5s transform, 0.7s left 0.8s, 0.2s margin 0.8s;
    top: 0px;
    margin-left: 4px;
  }
  .map-base.active .side-5 .front {
    transform: rotateY(180deg);
    transition: 0.1s transform;
  }
  .map-base.active .side-6 {
    left: 150%;
    transform: rotateY(180deg);
    transform-origin: center right;
    margin-left: -8px;
    transition: 0.5s transform 0.3s, 0.7s left 0.8s, 0.5s top 0.8s,
      0.5s margin 0.8s;
  }
  .map-base.active .side-6 .front {
    transform: rotateY(180deg);
    transition: 0.1s transform;
  }
  .map-base.active .footstep,
  .map-base.active .scroll-name {
    opacity: 1;
    transition: 0.5s opacity 2.5s;
  }

  @keyframes footsteps-1 {
    10% {
      transform: translate(8px, -15px) rotate(30deg);
    }
    20% {
      transform: translate(30px, -45px) rotate(30deg);
    }
    30% {
      transform: translate(40px, -75px) rotate(20deg);
    }
    40% {
      transform: translate(45px, -100px) rotate(10deg);
    }
    50% {
      transform: translate(50px, -125px) rotate(10deg);
    }
    60% {
      transform: translate(50px, -135px) rotate(10deg);
    }
    100% {
      transform: translate(50px, -135px) rotate(20deg);
    }
  }
  @keyframes footsteps-2 {
    80% {
      transform: translate(-170px, -25px) rotate(-90deg);
    }
    100% {
      transform: translate(-180px, -25px) rotate(-90deg);
    }
  }
  @keyframes scroll-1 {
    10% {
      transform: translate(8px, -15px);
    }
    20% {
      transform: translate(30px, -45px);
    }
    30% {
      transform: translate(40px, -75px);
    }
    40% {
      transform: translate(45px, -100px);
    }
    50% {
      transform: translate(50px, -125px);
    }
    60% {
      transform: translate(50px, -135px);
    }
    100% {
      transform: translate(50px, -135px);
    }
  }
  @keyframes scroll-2 {
    80% {
      transform: translate(-170px, -25px);
    }
    100% {
      transform: translate(-180px, -25px);
    }
  }

  main {
    text-align: center;
  }

  button {
    position: fixed;
    top: 20px;
    height: 50px;
    width: 200px;
    border-radius: 10px;
  }
</style>


<main style="width: 1400px">

<div class="main-content">
  <div class="map-base { access ? 'active' : '' }">
    
    {#each rumtreibers as rumtreiber}
    <div class="footsteps footsteps-1" >
      <div class="footstep left"></div>
      <div class="footstep right"></div>
      <div class="scroll-name" style="top: {rumtreiber.top}%;left: {rumtreiber.left}%"> 
        <p>{rumtreiber.name}</p>
      </div>
    </div>
    {/each}


    <!--<div class="footsteps footsteps-2">
      <div class="footstep left"></div>
      <div class="footstep right"></div>
      <div class="scroll-name"> 
        <p>Magali</p>
      </div>
    </div>-->
    <div class="map-flap flap--1">
      <div class="map-flap__front"></div>
      <div class="map-flap__back"></div>
    </div>
    <div class="map-flap flap--2">
      <div class="map-flap__front"></div>
      <div class="map-flap__back"></div>
    </div>
    <div class="map-side side-1">
      <div class="front" style="--image: url('https://meowlivia.s3.us-east-2.amazonaws.com/codepen/map/8.png')"></div>
      <div class="back"></div>
    </div>
    <div class="map-side side-2">
      <div class="front" style="--image: url('https://meowlivia.s3.us-east-2.amazonaws.com/codepen/map/18.png')"></div>
      <div class="back"></div>
    </div>
    <div class="map-side side-3">
      <div class="front" style="--image: url('https://meowlivia.s3.us-east-2.amazonaws.com/codepen/map/7.png')"></div>
      <div class="back"></div>
    </div>
    <div class="map-side side-4">
      <div class="front" style="--image: url('https://meowlivia.s3.us-east-2.amazonaws.com/codepen/map/10.png')"></div>
    </div>
    <div class="map-side side-5">
      <div class="front" style="--image: url('https://meowlivia.s3.us-east-2.amazonaws.com/codepen/map/6.png')"></div>
      <div class="back"></div>
    </div>
    <div class="map-side side-6">
      <div class="front" style="--image: url('https://meowlivia.s3.us-east-2.amazonaws.com/codepen/map/11.png')"></div>
      <div class="back"></div>
    </div>
  </div>
</div>


<!--{#if access}<button on:click={ () => { access = false; } }>Karte schließen</button>{/if}-->

<pre>{JSON.stringify($Store, null, 2)}</pre>

</main>