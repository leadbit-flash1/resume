//uniform vec3 paintColor1;
//uniform vec3 paintColor2;
//uniform vec3 paintColor3;
uniform sampler2D normalMap;
uniform sampler2D specularMap;
uniform samplerCube envMap;
varying vec2 vUv;
varying float fFresnel;
//varying vec4 mvPosition;


varying vec3 vReflect;
varying vec3 worldNormal;


void main() {

 
/*
  float  fFresnelSq = fFresnel * fFresnel;
  vec3 paintColor = fFresnel   * paintColor1   +
                    fFresnelSq * paintColor2 +
                    fFresnelSq * fFresnelSq * paintColor3;
*/
vec4 envColor = textureCube( envMap, vec3( -vReflect.x, vReflect.yz ) );
vec4 color1=texture2D(normalMap,vUv,-1.5);
vec4 specular1=texture2D(specularMap,vUv);
vec4 specular2=1.-specular1;

  gl_FragColor =//max( 
				mix(color1,color1*envColor+0.1,specular1*2.)*1.2
				//,
				//color1*vec4(paintColor, 1.0)*specular2
				//)
				;
				
	//gl_FragColor=mix(vec4(0.5),gl_FragColor,clamp(fFresnel*4.,0.,1.));
	gl_FragColor=mix(gl_FragColor*0.5+0.5*specular2,gl_FragColor,clamp(fFresnel*2.,0.,1.));
	gl_FragColor=mix(0.75*gl_FragColor,min(gl_FragColor,envColor)*1.75,worldNormal.z);
}