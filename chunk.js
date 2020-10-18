const texture = new THREE.TextureLoader().load( './assets/grass_top.png' );
const normal = new THREE.TextureLoader().load('./assets/grass_top_n.png');
const specular = new THREE.TextureLoader().load('./assets/grass_top_s.png');
      
texture.magFilter = THREE.NearestFilter;
texture.minFilter = THREE.LinearMipMapLinearFilter;
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;

class Chunk{
    constructor(){
      this.chunkPosX = 0;
      this.chunkPosY = 0;


      this.blockHeightmap = new Float32Array(16 * 16);
      this.blockTypes = new Float32Array(16 * 16 * 16);
      this.count = 0;

      this.vertices = new Float32Array(3 * 6 * 16 * 16);
      this.count = 0;

      this.textures = new Float32Array(2 * 6 * 16 * 16);
      this.tCount = 0;

      this.hCount = 0;

      this.geometry = new THREE.BufferGeometry();
      this.positions = [];


      this.terrainMat = new THREE.MeshPhongMaterial( { map: texture, normalMap: normal, specularMap: specular, side: THREE.BackSide , specular: new THREE.Color(0x222222), normalScale: new THREE.Vector2(1.0, 1.0), shadowSide: THREE.BackSide} );
      this.terrainMat.shininess = 15;
    }

    print(){
      console.log(this.blockHeightmap);
    }

    finalize(){

        this.geometry.addAttribute( 'position', new THREE.BufferAttribute(this.vertices, 3 ) );
        this.geometry.addAttribute( 'uv', new THREE.BufferAttribute(this.textures, 2));

        var tempGeo = new THREE.Geometry().fromBufferGeometry(this.geometry);
        tempGeo.mergeVertices();
        tempGeo.computeVertexNormals();
        tempGeo.computeFaceNormals();

        this.geometry = new THREE.BufferGeometry().fromGeometry(tempGeo);

        var mesh = new THREE.Mesh(this.geometry, this.terrainMat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);

        var grass = new THREEx.createGrassTufts(this.positions);
        scene.add(grass);
    }
}
