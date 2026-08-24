varying vec4 mvPosition;
varying vec2 vUv;
varying float fFresnel;

varying vec3 vReflect;
varying vec3 worldNormal;

void main() {
  mvPosition = modelViewMatrix * vec4( position, 1.0 );

  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
  
  worldNormal = normalize( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );


  vec3 cameraToVertex = normalize(worldPosition.xyz - cameraPosition);
  vReflect = reflect( cameraToVertex, worldNormal );
  fFresnel = dot(  -cameraToVertex , worldNormal );

  vUv = uv;

  gl_Position = projectionMatrix * mvPosition;
}