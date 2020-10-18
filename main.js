

if ( WEBGL.isWebGLAvailable() === false ) {
  document.body.appendChild( WEBGL.getWebGLErrorMessage() );
}
var camera, controls, scene, renderer;
var sky, sunSphere, water, elapsed;
var savepass, blendpass, outputpass;
var cloudTerrain;
elapsed = 0;
var procCloudMat;
var clock = new THREE.Clock()
var ambientLight, ambientColor;

var ambientMax = new THREE.Color(0xFFFFFF);
var ambientMin = new THREE.Color(0x333333);
ambientColor = ambientMin;
var directionalLight;
var bokehPass;
var effectController  = {
  turbidity: 15,
  rayleigh: 2,
  mieCoefficient: 0.015,
  mieDirectionalG: 0.99,
  luminance: 1,
  inclination: 0.0001,
  azimuth: 0.25,
  sun: false
};

var params = {
	exposure: Math.pow( 0.94, 5.0 ),
	bloomStrength: 0.1652,
	bloomThreshold: 0.13245,
	bloomRadius: 0.5
};


var bloomPass, fxaaPass, adaptToneMappingPass;

var aparams = {
  bloomAmount: 1.0,
  sunLight: 8.0,
  enabled: true,
  avgLuminance: 0.9,
  middleGrey: 1.34,
  maxLuminance: 16,
  adaptionRate: 5.0
};

var composer;

var distance = 400000;
var deltaTime = 0, absoluteDaytime = 0, dayTickTime = 0;
var dayTimeFogColor = new THREE.Color(0xbbffff);
var nightTimeFogColor = new THREE.Color(0x0b1b2b);
var sunRiseSetFogColor = new THREE.Color(0x2c1f12);
var fogColor = sunRiseSetFogColor;

var renderScene;
var noise2d;
function initSky() {
  sky = new THREE.Sky();
  sky.scale.setScalar( 450000 );
  scene.add( sky );

  sunSphere = new THREE.Mesh(
    new THREE.SphereBufferGeometry( 20000, 16, 8 ),
    new THREE.MeshBasicMaterial( { color: 0xffffff } )
  );

  sunSphere.position.y = - 700000;
  sunSphere.visible = false;
  scene.add( sunSphere );

  updateSkydome();
}

function initWater(){
  var waterGeometry = new THREE.PlaneBufferGeometry( 25600, 25600, 256, 256 );

				water = new THREE.Water(
					waterGeometry,
					{
						textureWidth: 1024,
						textureHeight: 1024,
						waterNormals: new THREE.TextureLoader().load( 'assets/water.jpg', function ( texture ) {

							texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

						} ),
						alpha: 1.0,
						sunDirection: directionalLight.position.clone().normalize(),
						sunColor: 0xffffff,
						waterColor: 0x001e0f,
						distortionScale: 3.7,
						fog: scene.fog !== undefined
					}
				);

        water.rotation.x = - Math.PI / 2;
        water.position.x = 12800;
        water.position.z = 12800;
        water.position.y = 8000;

				scene.add( water );
}

function initClouds(){

  //CLOUDS

  var verts = new Float32Array(6 * 3);
  verts[0] = -102400 + 12800;
  verts[1] = 25600;
  verts[2] = -102400 + 12800;

  verts[3] = 102400 + 12800;
  verts[4] = 25600;
  verts[5] = -102400 + 12800;

  verts[6] = 102400 + 12800;
  verts[7] = 25600;
  verts[8] = 102400 + 12800;

  verts[9] = 102400 + 12800;
  verts[10] = 25600;
  verts[11] = 102400 + 12800;

  verts[12] = -102400 + 12800;
  verts[13] = 25600;
  verts[14] = 102400 + 12800;

  verts[15] = -102400 + 12800;
  verts[16] = 25600;
  verts[17] = -102400 + 12800;

  var texs = new Float32Array(6 * 2);
  texs[0] = 0;
  texs[1] = 0;

  texs[2] = 1;
  texs[3] = 0;

  texs[4] = 1;
  texs[5] = 1;

  texs[6] = 1;
  texs[7] = 1;

  texs[8] = 0;
  texs[9] = 1;

  texs[10] = 0;
  texs[11] = 0;

  var cloudGeometry = new THREE.BufferGeometry();
  cloudGeometry.addAttribute('position', new THREE.BufferAttribute(verts, 3));
  cloudGeometry.addAttribute('uv', new THREE.BufferAttribute(texs, 2));

  var procFrag = document.getElementById("cloudsFragShader").innerText;
  var procVert = document.getElementById("cloudsVertShader").innerText;

  procCloudMat = new THREE.ShaderMaterial({
    uniforms: {
      "time" : {value: 1.0},
      "sunIntensity" : {value : 1.0},
    },
    vertexShader: procVert,
    fragmentShader: procFrag,
    fog: false,
    transparent: true,
    side: THREE.DoubleSide,
  });


  cloudTerrain = new THREE.Mesh(cloudGeometry, procCloudMat);
  cloudTerrain.geometry.computeVertexNormals();
  scene.add(cloudTerrain);

  THREE.ShaderLib.lambert = {
    uniforms: THREE.ShaderLib.lambert.uniforms,
    vertexShader:
    `
      #define LAMBERT
      //uniform float time;
      varying vec3 vLightFront;
      uniform float opacity;
      
      #ifdef DOUBLE_SIDED
        varying vec3 vLightBack;
      #endif
      #include <common>
      #include <uv_pars_vertex>
      #include <uv2_pars_vertex>
      #include <envmap_pars_vertex>
      #include <bsdfs>
      #include <lights_pars_begin>
      #include <color_pars_vertex>
      #include <fog_pars_vertex>
      #include <morphtarget_pars_vertex>
      #include <skinning_pars_vertex>
      #include <shadowmap_pars_vertex>
      #include <logdepthbuf_pars_vertex>
      #include <clipping_planes_pars_vertex>
      void main() {
        #include <uv_vertex>
        #include <uv2_vertex>
        #include <color_vertex>
        #include <beginnormal_vertex>
        #include <morphnormal_vertex>
        #include <skinbase_vertex>
        #include <skinnormal_vertex>
        #include <defaultnormal_vertex>
        #include <begin_vertex>
        
        float time = opacity;
			  vec3 expPos = position;
			  float cosX =  cos(time * 0.3 + expPos.x / 100.0);
			  float sinX = sin(time * 0.3 + expPos.x / 120.0);
			  expPos.x += 70.0 * cosX * cosX * cosX + 70.0 * sinX * sinX;
			  float cosY = cos(time * 0.3 + expPos.y / 80.0);
			  float sinY = sin(time * 0.3 + expPos.y / 200.0);
			  expPos.y += 35.0 * sinY * sinY * sinY + 35.0 * cosY * cosY;
			  float cosZ = cos(time * 0.15 + expPos.z / 90.0);
			  float sinZ = cos(time * 0.15 + expPos.z / 160.0);
        expPos.z -= 60.0 * sinZ * cosZ * cosZ + 60.0 * sinZ * sinZ * cosZ;
        transformed = expPos;
        
        #include <morphtarget_vertex>
        #include <skinning_vertex>
        #include <project_vertex>
        #include <logdepthbuf_vertex>
        #include <clipping_planes_vertex>
        #include <worldpos_vertex>
        #include <envmap_vertex>
        #include <lights_lambert_vertex>
        #include <shadowmap_vertex>
        #include <fog_vertex>
      }
    `,
    fragmentShader:
    `
      uniform vec3 diffuse;
      uniform vec3 emissive;
      uniform float opacity;
      varying vec3 vLightFront;
      #ifdef DOUBLE_SIDED
        varying vec3 vLightBack;
      #endif

			const float threshold = 0.15;
      #include <common>
      #include <packing>
      #include <dithering_pars_fragment>
      #include <color_pars_fragment>
      #include <uv_pars_fragment>
      #include <uv2_pars_fragment>
      #include <map_pars_fragment>
      #include <alphamap_pars_fragment>
      #include <aomap_pars_fragment>
      #include <lightmap_pars_fragment>
      #include <emissivemap_pars_fragment>
      #include <envmap_pars_fragment>
      #include <bsdfs>
      #include <lights_pars_begin>
      #include <fog_pars_fragment>
      #include <shadowmap_pars_fragment>
      #include <shadowmask_pars_fragment>
      #include <specularmap_pars_fragment>
      #include <logdepthbuf_pars_fragment>
      #include <clipping_planes_pars_fragment>
      void main() {
        #include <clipping_planes_fragment>
        vec4 diffuseColor = vec4( diffuse, opacity );
        ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
        vec3 totalEmissiveRadiance = emissive;
        #include <logdepthbuf_fragment>
        #include <map_fragment>
        #include <color_fragment>
        #include <alphamap_fragment>
        #include <alphatest_fragment>
        #include <specularmap_fragment>
        #include <emissivemap_fragment>
        reflectedLight.indirectDiffuse = getAmbientLightIrradiance( ambientLightColor );
        #include <lightmap_fragment>
        reflectedLight.indirectDiffuse *= BRDF_Diffuse_Lambert( diffuseColor.rgb );
        #ifdef DOUBLE_SIDED
          reflectedLight.directDiffuse = ( gl_FrontFacing ) ? vLightFront : vLightBack;
        #else
          reflectedLight.directDiffuse = vLightFront;
        #endif
          reflectedLight.directDiffuse *= BRDF_Diffuse_Lambert( diffuseColor.rgb ) * getShadowMask();
        #include <aomap_fragment>
        vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
        #include <envmap_fragment>
        
        gl_FragColor = vec4( outgoingLight, diffuseColor.a );
        #include <tonemapping_fragment>
        #include <encodings_fragment>
        #include <fog_fragment>
        #include <premultiplied_alpha_fragment>
        #include <dithering_fragment>

        vec4 actualTexture = texture2D(map, vUv.st);
        if (actualTexture[0] < threshold && actualTexture[1] < threshold && actualTexture[2] < threshold) {
          discard;
        }
        gl_FragColor = vec4( gl_FragColor.rgb, actualTexture.a );
      }
    `
  }

  grassShaderMat = new THREE.MeshLambertMaterial( {map: grassTexture, shadowSide: THREE.BackSide, side: THREE.DoubleSide} );
 
}

function initLighting(){

  directionalLight = new THREE.DirectionalLight( 0xfff18c, 1 );
  directionalLight.position.set( 0, 15000, 0);
  directionalLight.castShadow = true;
  directionalLight.shadow.camera.position.set(camera.position)
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = -25600;
  directionalLight.shadow.camera.far = 25600;
  directionalLight.shadow.camera.left = -25600;
  directionalLight.shadow.camera.right = 25600;
  directionalLight.shadow.camera.top = 25600;
  directionalLight.shadow.camera.bottom = -25600;
  directionalLight.shadow.camera.updateProjectionMatrix();
  directionalLight.shadow.bias = -0.0016;
  scene.add(directionalLight);


  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.toneMappingWhitePoint = 2;

  renderer.physicallyCorrectLights = true;

	renderer.autoClear = true;
  renderScene = new THREE.RenderPass( scene, camera );

  ambientLight = new THREE.AmbientLight( 0x222222 );
  scene.add( ambientLight );
  scene.add(directionalLight.target);

  /*
    Post Processing Stack:
    - FXAA (Antialiasing)             - DONE
    - Color Correction                - DONE
    - Adaptive Eye                    - DONE
    - Bloom                           - DONE
    - Volumetric Lighting / Godrays   - TBD
    - Film Grain                      - DONE
    - Vignette                        - DONE
  */

  bokehPass = new THREE.BokehPass( scene, camera, {

					width: window.innerWidth,
					height: window.innerHeight
        } );
  bokehPass.renderToScreen = false;

  fxaaPass = new THREE.ShaderPass( THREE.FXAAShader );
  fxaaPass.renderToScreen = false;
  var pixelRatio = renderer.getPixelRatio();
  fxaaPass.material.uniforms[ 'resolution' ].value.x = 1 / ( window.innerWidth * pixelRatio );
  fxaaPass.material.uniforms[ 'resolution' ].value.y = 1 / ( window.innerHeight * pixelRatio );


  bloomPass = new THREE.UnrealBloomPass( new THREE.Vector2( window.innerWidth * 0.5, window.innerHeight * 0.5), 1.5, 0.4, 0.85 );

  bloomPass.threshold = params.bloomThreshold;
  bloomPass.strength = params.bloomStrength;
  bloomPass.radius = params.bloomRadius;

  noise2d = new SimplexNoise();

  var effectVignette = new THREE.ShaderPass( THREE.VignetteShader );
  effectVignette.uniforms[ "offset" ].value = 0.95;
  effectVignette.uniforms[ "darkness" ].value = 1.25;
  effectVignette.renderToScreen = false;

  var effectFilm = new THREE.FilmPass( 0.05, 0, 1, false );

  adaptToneMappingPass = new THREE.AdaptiveToneMappingPass( true, 256 );
  adaptToneMappingPass.needsSwap = true;

  var colorCorrection = new THREE.ShaderPass(THREE.HueSaturationShader);
  colorCorrection.uniforms[ "saturation" ].value = 0.15;
  colorCorrection.uniforms[ "hue" ].value = 0.0;
  colorCorrection.renderToScreen = false;

  if(navigator.appVersion.indexOf("Mac")!=-1 && !(!!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime))){
    savepass = new THREE.SavePass( new THREE.WebGLRenderTarget( window.innerWidth*3, window.innerHeight*3, renderTargetParameters ) );
  }else{
    savepass = new THREE.SavePass( new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, renderTargetParameters ) );
  }
  var renderTargetParameters = {
  			minFilter: THREE.LinearFilter,
  			magFilter: THREE.LinearFilter,
  			stencilBuffer: false
  		};

  blendpass = new THREE.ShaderPass( THREE.BlendShader, 'tDiffuse1' );
	blendpass.uniforms[ 'tDiffuse2' ].value = savepass.renderTarget.texture;
	blendpass.uniforms[ 'mixRatio' ].value = 0.25;

  outputpass = new THREE.ShaderPass( THREE.CopyShader );
	outputpass.renderToScreen = true;

  composer = new THREE.EffectComposer( renderer );
  if(navigator.appVersion.indexOf("Mac")!=-1){
    composer.setSize( window.innerWidth*3, window.innerHeight*3);
  }else{
    composer.setSize( window.innerWidth, window.innerHeight);
  }
  composer.addPass( renderScene );
  composer.addPass( fxaaPass );
  composer.addPass( colorCorrection );
  composer.addPass( adaptToneMappingPass );
  composer.addPass( bokehPass );
  composer.addPass( bloomPass );
  composer.addPass( effectFilm );
  composer.addPass( effectVignette );
  composer.addPass( blendpass);
  composer.addPass( savepass );
  composer.addPass( outputpass );
}

function calcNoise(x, z){
  var A, B, C, D, E, F, G, H;
  A = Math.abs(noise2d.noise(x/512, z/512) * 378);
  B = Math.abs(noise2d.noise(x/256, z/256) * 256);
  C = Math.abs(noise2d.noise(x/128, z/128) * 128);
  D = Math.abs(noise2d.noise(x/64, z/64) * 64);
  E = Math.abs(noise2d.noise(x/32, z/32) * 32);
  F = Math.abs(noise2d.noise(x/16, z/16) * 16);
  G = Math.abs(noise2d.noise(x/8, z/8) * 4);
  H = Math.abs(noise2d.noise(x/4, z/4) * 2);
  return (A + B + C + D + E + F + G + H + 660) / 11;
}

function initGeometry(chunkX, chunkY){

  var chunk = new Chunk();


    for(var x = 0; x < 16; x++){
      for(var z = 0; z < 16; z++){
        var A = Math.floor(calcNoise(x + chunkX * 16, z + chunkY * 16));
        var B = Math.floor(calcNoise(x + chunkX * 16, z + chunkY * 16));
        var C = Math.floor(calcNoise(x + chunkX * 16, z + chunkY * 16));
        var D = Math.floor(calcNoise(x + chunkX * 16, z + chunkY * 16));
        chunk.blockHeightmap[chunk.hCount++] = Math.ceil( (A + B + C + D) / 4.0 );
      }
    }

    for(var x = 0; x < 16; x++){
      for(var z = 0; z < 16; z++){

        var tempX = x;
        var tempZ = z;

        chunk.vertices[chunk.count++] = x * 100 + chunkX * 16 * 100;
        chunk.vertices[chunk.count++] = calcNoise(x + chunkX * 16, z + chunkY * 16) * 100;
        chunk.vertices[chunk.count++] = z * 100 + chunkY * 16 * 100
        chunk.textures[chunk.tCount++] = 0;
        chunk.textures[chunk.tCount++] = 0;

        x++;

        chunk.vertices[chunk.count++] = x * 100 + chunkX * 16 * 100
        chunk.vertices[chunk.count++] = calcNoise(x + chunkX * 16, z + chunkY * 16) * 100;
        chunk.vertices[chunk.count++] = z * 100 + chunkY * 16 * 100
        chunk.textures[chunk.tCount++] = 1;
        chunk.textures[chunk.tCount++] = 0;


        z++;
        chunk.vertices[chunk.count++] = x * 100 + chunkX * 16 * 100
        chunk.vertices[chunk.count++] = calcNoise(x + chunkX * 16, z + chunkY * 16) * 100;
        chunk.vertices[chunk.count++] = z * 100 + chunkY * 16 * 100
       chunk.textures[chunk.tCount++] = 1;
       chunk.textures[chunk.tCount++] = 1;

       chunk.vertices[chunk.count++] = x * 100 + chunkX * 16 * 100
       chunk.vertices[chunk.count++] = calcNoise(x + chunkX * 16, z + chunkY * 16) * 100;
       chunk.vertices[chunk.count++] = z * 100 + chunkY * 16 * 100
       chunk.textures[chunk.tCount++] = 1;
       chunk.textures[chunk.tCount++] = 1;


        x--;
       chunk.vertices[chunk.count++] = x * 100 + chunkX * 16 * 100
       chunk.vertices[chunk.count++] = calcNoise(x + chunkX * 16, z + chunkY * 16) * 100;
       chunk.vertices[chunk.count++] = z * 100 + chunkY * 16 * 100
       chunk.textures[chunk.tCount++] = 0;
       chunk.textures[chunk.tCount++] = 1;

        z--;
       chunk.vertices[chunk.count++] = x * 100 + chunkX * 16 * 100
       chunk.vertices[chunk.count++] = calcNoise(x + chunkX * 16, z + chunkY * 16) * 100;
       chunk.vertices[chunk.count++] = z * 100 + chunkY * 16 * 100
       chunk.textures[chunk.tCount++] = 0;
       chunk.textures[chunk.tCount++] = 0;
       
       if(calcNoise(x + chunkX * 16, z + chunkY * 16)*100 > 8100 && Math.abs(noise2d.noise( (x + chunkX * 16) / 60, (z + chunkY*16) / 60)) < 0.95){
        chunk.positions.push(new THREE.Vector3(x * 100 + chunkX * 16 * 100, calcNoise(x + chunkX * 16, z + chunkY * 16)*100 , z * 100 + chunkY * 16 * 100))
       }
        x = tempX;
        z = tempZ;

      }
  }
  chunk.finalize();
}

function init() {
  var canvas = document.getElementById("canvasID");

  camera = new THREE.PerspectiveCamera( 90, window.innerWidth / window.innerHeight, 1, 256000 );
  camera.position.set( 12800, 9000, 12800 );
  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer({ canvas: canvas });
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild( renderer.domElement );

  controls = new THREE.FirstPersonControls( camera  );

  controls.movementSpeed = 1000;
  controls.lookSpeed = 0.125;
  controls.lookVertical = true;
  controls.constrainVertical = true;
  controls.verticalMin = 0 ;
  controls.verticalMax = Math.PI;

  initLighting();
  initClouds();
  initWater();
  initSky();
  window.addEventListener( 'resize', onWindowResize, false );

  {
  for(var x = 0; x < 16; x++){
    for(var y = 0; y < 16; y++){
      initGeometry(x, y);
    }
  }
  }

  renderUpdate();
}


function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight);
  if(navigator.appVersion.indexOf("Mac")!=-1){
    composer.setSize( window.innerWidth*3, window.innerHeight*3);
  }else{
      composer.setSize( window.innerWidth, window.innerHeight);
  }
  controls.handleResize();

  var pixelRatio = renderer.getPixelRatio();
	fxaaPass.material.uniforms[ 'resolution' ].value.x = 1 / ( window.innerWidth * pixelRatio );
	fxaaPass.material.uniforms[ 'resolution' ].value.y = 1 / ( window.innerHeight * pixelRatio );

  renderUpdate();
}

function updateSkydome(){
  var distance = 400000;

  var uniforms = sky.material.uniforms;
  uniforms[ "turbidity" ].value = effectController.turbidity;
  uniforms[ "rayleigh" ].value = effectController.rayleigh;
  uniforms[ "luminance" ].value =  effectController.luminance;
  uniforms[ "mieCoefficient" ].value = effectController.mieCoefficient;
  uniforms[ "mieDirectionalG" ].value = effectController.mieDirectionalG;


  var newIncline = (dayTickTime / 24000);

  var theta = 2 * Math.PI * ( newIncline - 0.5 );
  var phi = 2 * Math.PI * ( effectController.azimuth - 0.5 );


  sunSphere.position.x = distance * Math.cos( phi );
  sunSphere.position.y = distance * Math.sin( phi ) * Math.sin( theta );
  sunSphere.position.z = distance * Math.sin( phi ) * Math.cos( theta );

  distance = 25600;
  directionalLight.position.set( distance * Math.cos( phi ), distance * Math.sin( phi ) * Math.sin( theta ), distance * Math.sin( phi ) * Math.cos( theta ));


  if(newIncline >= 0 && newIncline < 0.1){
    var interp = newIncline / 0.1;
    directionalLight.intensity = interp * 1;
    fogColor = new THREE.Color(sunRiseSetFogColor).lerp(dayTimeFogColor, interp);
    ambientColor = new THREE.Color(ambientMin).lerp(ambientMax, Math.min(newIncline / 0.05, 1.0));
    
  }else if(newIncline > 0.4 && newIncline < 0.5){
    var interp = (newIncline - 0.4) / 0.1;
    directionalLight.intensity = (0.5 - newIncline) / 0.1 * 1;
    ambientColor = new THREE.Color(ambientMax).lerp(ambientMin, (newIncline - 0.45) / 0.05 );
    fogColor = new THREE.Color(dayTimeFogColor).lerp(sunRiseSetFogColor, interp);
  }else if (newIncline >= 0.1 && newIncline <= 0.4){
    directionalLight.intensity = 1;
    ambientColor = ambientMax;
    fogColor = dayTimeFogColor;
  }else if (newIncline >= 0.5 && newIncline < 0.52){
    fogColor = new THREE.Color(sunRiseSetFogColor).lerp(nightTimeFogColor, (newIncline - 0.5) / 0.02);
  }else if(newIncline > 0.98 && newIncline <= 1.0){
    fogColor = new THREE.Color(nightTimeFogColor).lerp(sunRiseSetFogColor, (newIncline - 0.98) / 0.02);
  }else{
    directionalLight.intensity = 0;
    fogColor = nightTimeFogColor;
    ambientColor = ambientMin;
  }
  directionalLight.target.position.set(0, 0, 0);

  sunSphere.visible = effectController.sun;

  uniforms[ "sunPosition" ].value.copy( sunSphere.position );


  adaptToneMappingPass.setAdaptionRate( aparams.adaptionRate );
	adaptToneMappingPass.enabled = params.enabled;
	adaptToneMappingPass.setMaxLuminance( aparams.maxLuminance );
  adaptToneMappingPass.setMiddleGrey( aparams.middleGrey );
  
  water.material.uniforms[ 'sunDirection' ].value.copy( directionalLight.position ).normalize();

}


function renderUpdate() {
  deltaTime = clock.getDelta();
  absoluteDaytime += deltaTime;
  elapsed += deltaTime;
  dayTickTime = Math.round(absoluteDaytime * (24000 / 1200));


  if(dayTickTime >= 23999){
    dayTickTime = 0;
    absoluteDaytime = 0;
  }
  controls.update( deltaTime );
  renderer.gammaInput = true;
  renderer.gammaOutput = true;
  cloudTerrain.position = camera.position;

  procCloudMat.uniforms["time"].value = elapsed;
  procCloudMat.uniforms["sunIntensity"].value = directionalLight.intensity;
  grassShaderMat.opacity = elapsed;
  //grassShaderMat.uniforms["intensity"].value = directionalLight.intensity;
  //grassShaderMat.uniforms[""]

  water.material.uniforms[ 'time' ].value += deltaTime;

  updateSkydome();
  scene.fog = new THREE.Fog(fogColor.getHex(), 1, 35000);
  ambientLight.color = ambientColor;
  composer.render(deltaTime);
  requestAnimationFrame(renderUpdate);
}
