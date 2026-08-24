precision highp float;

//uniform sampler2D heightmap;
//uniform sampler2D normalmap;
//uniform sampler2D tex1;
uniform sampler2D tAlphaMap, tSplat1, tSplat2, tSplat3, tSplat4, tTangent1, tTangent2;//, lightMap1;
//uniform float scale;

		// chunk(common);
		// chunk(lights_pars_begin);
		// chunk(packing);
		// chunk(shadowmap_pars_fragment);
		// chunk(shadowmask_pars_fragment);

varying vec3 pos;
varying vec2 uVu;
varying vec3 mask1;
varying float fixId1;

/////////////////////////////////////////

/*
float DecodeFloatRGBA( vec4 rgba ) {
  return dot( rgba.rgb, vec3(1.0, 1./255.0, 1./65025.0));//, 1./16581375.0) );
}

float clamp01(float f)
{
	return max(min(f, 1.0), 0.0);
}
vec3 road(float f)
{
	return f > 0.8 ? vec3(mix(vec3(0.3), vec3(0.8), (f - 0.8) * 5.0)) : vec3(mix(vec3(0.4, 0.5, 0.1), vec3(0.3), clamp01(f * 5.0)));
}
*/

/*
float dot2( in vec2 v ) { return dot(v,v); }
float sdSqSegment( in vec2 p, in vec4 ab )
{
	//p.xy=p.yx;//change coords!!
	//ab/=1024.;
	//ab.xz=1.-ab.xz;
	//ab.yw=1.-ab.yw;
	//ab=1.-ab;
	//vec2 pa = p - ab.xy, ba = ab.zw - ab.xy;
	vec2 pa = p - ab.yx;
	//if(pa.x>0.1)return 1.;
	vec2 ba = ab.wz - ab.yx;
	return dot2( pa - ba*clamp01( dot(pa,ba)/dot(ba,ba)) );
}
*/
/////////////////////////////////////////
vec3 solveCubic(float a, float b, float c)
{
   float p = b - a*a / 3.0, p3 = p*p*p;
   float q = a * (2.0*a*a - 9.0*b) / 27.0 + c;
   float d = q*q + 4.0*p3 / 27.0;
   float offset = -a / 3.0;
   if(d >= 0.0) { 
      float z = sqrt(d);
      vec2 x = (vec2(z, -z) - q) / 2.0;
      vec2 uv = sign(x)*pow(abs(x), vec2(1.0/3.0));
	  
	  
	  
	//if( abs(p3/27.) < q*q*0.001 ) 
	//{
	//return vec3(0.);
	//	if( q <0. )
	//		return vec3(uv.x +  offset + p / ( 3. * -pow(-q,1./3.) ) );
	//	else
	//		return vec3(uv.y +  offset + p / ( 3. * pow(q,1./3.) )	);
	//}
		if(uv.x==0.)
			return vec3(uv.y +  offset + p / ( 3. * pow(q, 1./3.) )	);
		else	  
		if(uv.y==0.)
			return vec3(uv.x +  offset + p / ( 3. * -pow(-q, 1./3.) ) );
		else
			return vec3(offset + uv.x + uv.y);
   }
   float v = acos(-sqrt(-27.0 / p3) * q / 2.0) / 3.0;
   float m = cos(v), n = sin(v)*1.732050808;
   return vec3(m + m, -n - m, n - m) * sqrt(-p / 3.0) + offset;
}


vec3 sdBezier(vec2 A, vec2 B, vec2 C, vec2 p)
{
   B = mix(B + vec2(1e-4), B, abs(sign(B * 2.0 - A - C)));
   vec2 a = B - A, b = A - B * 2.0 + C, c = a * 2.0, d = A - p;
   vec3 k = vec3(3.*dot(a,b),2.*dot(a,a)+dot(d,b),dot(d,a)) / dot(b,b);

   vec2 t = clamp(solveCubic(k.x, k.y, k.z).xy, 0.0001, 0.9999);
   vec2 dp1 = d + (c + b*t.x)*t.x;
   float d1 = dot(dp1, dp1);
   vec2 dp2 = d + (c + b*t.y)*t.y;
   float d2 = dot(dp2, dp2);

   // note: 3rd root is actually never closest, we can just ignore it
     
   vec4 r = (d1 < d2) ? vec4(d1, t.x, dp1) : vec4(d2, t.y, dp2);
   
   // Sign is just cross product with gradient
   vec2 g = 2.*b*r.y + c;
   float s =  sign(g.x*r.w - g.y*r.z);
   
   float dist = sqrt(r.x);
   return vec3(s*dist, r.y, dist*dist);

}
/////////////////////////////////////////

uniform vec4 segments[18];
uniform vec4 segmentsC[18];


void main() {
	
	//vec4 segments[18];
	////segments[0]=vec4(0.,0.,1.,1.);
	////segments[1]=vec4(0.,1.,1.,0.);
	//segments[0]= vec4( 227./1024.,559./1024., 324./1024.,  -1./1024.); 
	//segments[1]= vec4( 420./1024.,651./1024., 227./1024., 559./1024.); 
	//segments[2]= vec4( 519./1024.,430./1024., 420./1024., 651./1024.); 
	//segments[3]= vec4( 623./1024.,355./1024., 519./1024., 430./1024.); 
	//segments[4]= vec4( 710./1024.,391./1024., 623./1024., 355./1024.); 
	//segments[5]= vec4( 757./1024.,469./1024., 710./1024., 391./1024.); 
	//segments[6]= vec4( 734./1024.,570./1024., 757./1024., 469./1024.); 
	//segments[7]= vec4( 638./1024.,596./1024., 734./1024., 570./1024.); 
	//segments[8]= vec4( 541./1024.,709./1024., 638./1024., 596./1024.); 
	//segments[9]= vec4( 536./1024.,802./1024., 541./1024., 709./1024.); 
	//segments[10]=vec4( 632./1024.,844./1024., 536./1024., 802./1024.); 
	//segments[11]=vec4( 744./1024.,805./1024., 632./1024., 844./1024.); 
	//segments[12]=vec4( 884./1024.,672./1024., 744./1024., 805./1024.); 
	//segments[13]=vec4( 912./1024.,373./1024., 884./1024., 672./1024.); 
	//segments[14]=vec4( 768./1024.,155./1024., 912./1024., 373./1024.); 
	//segments[15]=vec4( 426./1024.,206./1024., 768./1024., 155./1024.); 
	//segments[16]=vec4( 179./1024.,409./1024., 426./1024., 206./1024.); 
	//segments[17]=vec4( 142./1024.,806./1024., 179./1024., 409./1024.);


  //vec3 lightPos = normalize(vec3(1.0, 1.0, 1.0));
  //vec3 normal = normalize(texture2D(normalmap, uVu).xyz);

  //float illumination = dot(lightPos, normal);
  
  //float dist1=gl_FragCoord.z/gl_FragCoord.w/20.0;
  //float a1=min(1.0,max(1.4-dist1,0.0));
	float a1=2.-gl_FragCoord.z/gl_FragCoord.w/1000.0;


vec4 splat1;
vec4 splat2;
vec4 splat3;
vec4 splat4;

	//splat1 = mix(texture2D(tSplat1, uVu*100.0),texture2D(tSplat1, uVu*500.0),a1 );
	//splat2 = mix(texture2D(tSplat2, uVu*100.0),texture2D(tSplat2, uVu*500.0),a1 );
	//splat3 = mix(texture2D(tSplat3, uVu*100.0),texture2D(tSplat3, uVu*500.0),a1 );
	//splat4 = texture2D(tSplat4, (uVu-(vec2(DecodeFloatRGBA(texture2D(tTangent1,uVu)),DecodeFloatRGBA(texture2D(tTangent2,uVu)))-0.5)*2.*2.)*100.0);
	
	splat1 = texture2D(tSplat1, uVu*100.0);
	splat2 = texture2D(tSplat2, uVu*100.0);
	splat3 = texture2D(tSplat3, uVu*100.0);
	
	splat4 = texture2D(tSplat4, (mask1.xy)*320.0,-1.5);
	//splat4 = texture2D(tTangent1, uVu);
	
/*if(a1>0.0)
{
	splat1 = mix(texture2D(tSplat1, uVu*100.0),texture2D(tSplat1, uVu*500.0),a1 );
	splat2 = mix(texture2D(tSplat2, uVu*100.0),texture2D(tSplat2, uVu*500.0),a1 );
	splat3 = mix(texture2D(tSplat3, uVu*100.0),texture2D(tSplat3, uVu*500.0),a1 );
	splat4 = mix(texture2D(tSplat4, uVu*100.0),texture2D(tSplat4, uVu*500.0),a1 );
}
else
{
	splat1 = texture2D(tSplat1, uVu*100.0);
	splat2 = texture2D(tSplat2, uVu*100.0);
	splat3 = texture2D(tSplat3, uVu*100.0);
	splat4 = texture2D(tSplat4, uVu*100.0);
}*/


//vec4 splat1 = texture2D(tSplat2, uVu*100.0);
//vec4 splat2 = texture2D(tSplat2, uVu*100.0);
//vec4 splat3 = texture2D(tSplat3, uVu*100.0);
//vec4 splat4 = texture2D(tSplat4, uVu*100.0);
vec4 alphaMap = texture2D(tAlphaMap, uVu,2.);//SMOOTH IT

if(fixId1<18. && mask1.z>0.5)
{
	vec3 tmp1=vec3(0.,0.,1.);
	vec4 skip1=vec4(0.0001);
	for(int i=0;i<18;i++)
	//if(i==int(fixId1))
	{
		if(all(lessThan(segments[i], skip1)))continue;
		vec3 tmp1_1=sdBezier(segments[i].xy,segmentsC[i].xy,segments[i].zw,uVu);
			
		if(tmp1.z>tmp1_1.z)
		{
			tmp1=tmp1_1;
			tmp1.y*=segmentsC[i].z;
			
		};
			
	}
	splat4=texture2D(tSplat4, (tmp1.xy)*320.0,-1.5);//*vec4(0.,1.,1.,1.);
}
//gl_FragColor = splat1 * alphaMap.r + splat2 * alphaMap.g + splat3 * alphaMap.b + splat4 * alphaMap.a;
vec4 c1 = mix(splat1 * alphaMap.r + splat2 * alphaMap.g + splat3 * alphaMap.b, splat4, mask1.z);
//gl_FragColor = c1+vec4( vec3(c1.r,c1.g,c1.b)* ( getShadowMask() ), 1.0 );
//gl_FragColor = c1*(1.0  - ( 1.0 - getShadowMask() ) *0.5)*1.2;
//gl_FragColor = c1*(1.0  - ( 1.0 - getShadowMask() ) *0.5)*1.2 *(0.3+texture2D(lightMap1, uVu)*0.7);
gl_FragColor = c1*(0.7 + getShadowMask() *0.7);// *(0.5+texture2D(lightMap1, uVu)*0.5);
gl_FragColor.a=a1;
/*
if(dist1<4.0)
{
	float mask11=sdSqSegment( uVu, segments[0] );
	for(int i=1;i<18;i++)
	{
		//if(segments[0].x<0.)continue;
		mask11=min(
		//sdSqSegment( uVu, vec4(0.,0.,1.,1.) ),
		//sdSqSegment( uVu, vec4(0.,1.,1.,0.) ) 
		mask11,
		sdSqSegment( uVu, segments[i] )
		);
	}
	gl_FragColor+=min(0.3,pow(1./mask11/4000000.,1.));//-min(0.3,pow(1./mask1/10000.,10.));
	//gl_FragColor+=mask1;//-min(0.3,pow(1./mask1/10000.,10.));
}

*/
   //gl_FragColor = vec4(illumination*0.5, illumination*0.4, illumination*0.3, 1.0);
   //gl_FragColor = vec4(illumination*illumination*illumination, illumination*illumination*illumination, illumination*illumination*illumination, 1.0)*texture2D(tex1, uVu*500.0);
  // gl_FragColor = texture2D(heightmap, uVu);
  //gl_FragColor = vec4(sin(scale), cos(1.0 - scale*2.0), sin(scale*999999.0) + 0.5, 1.0);
}
