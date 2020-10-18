const grassTexture = new THREE.TextureLoader().load("assets/tallgrass.png");
//grassTexture.magFilter = THREE.NearestFilter;
//grassTexture.minFilter = THREE.LinearMipMapLinearFilter;

var grassShaderMat;
var THREEx	= THREEx	|| {}
function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

THREEx.createGrassTufts	= function(positions){
	// create the initial geometry
	var geometry	= new THREE.PlaneGeometry(300, 150)
	geometry.applyMatrix( new THREE.Matrix4().makeTranslation( 0, geometry.parameters.height/5, 0 ) );
	geometry.faces.forEach(function(face){
		face.vertexNormals.forEach(function(normal){
			normal.set(0.0,1.0,0.0).normalize()
		})
	})

	// create each tuft and merge their geometry for performance
	var mergedGeo	= new THREE.Geometry();
	for(var i = 0; i < positions.length; i++){
		var position	= positions[i]
		var baseAngle	= Math.PI * 2 * Math.random();
		

		var nPlanes	= 3
		for(var j = 0; j < nPlanes; j++){
			var angle	=  baseAngle+j*Math.PI/nPlanes

			// First plane
			var object3d	= new THREE.Mesh(geometry, material)
			object3d.rotateY(angle)
			object3d.position.copy(position)
			object3d.updateMatrix()
			mergedGeo.merge(object3d.geometry, object3d.matrix)
/*
			// The other side of the plane
			// - impossible to use ```side : THREE.BothSide``` as
			//   it would mess up the normals
			var object3d	= new THREE.Mesh(geometry, material)
			object3d.rotateY(angle+Math.PI)
			object3d.position.copy(position)
			object3d.updateMatrix()
			mergedGeo.merge(object3d.geometry, object3d.matrix)
			*/
		}
	}


	// build the material
	var material	= new THREE.MeshPhongMaterial({
		map		: grassTexture,
		//color		: 'grey',
        alphaTest	: 0.1,
        shininess: 5,
        flatShading: true
    })


    // create the mesh
    var tempGeo = new THREE.BufferGeometry().fromGeometry(mergedGeo);
    var mesh	= new THREE.Mesh(tempGeo, grassShaderMat)
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeFaceNormals();
    return mesh
}
