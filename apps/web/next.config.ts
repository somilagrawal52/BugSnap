import type { NextConfig } from 'next';
const config:NextConfig={transpilePackages:['@bugsnap/shared','@bugsnap/ui'],poweredByHeader:false,serverExternalPackages:['sharp'],async headers(){return [{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}]},{source:'/widget.js',headers:[{key:'Cache-Control',value:'public, max-age=300'},{key:'Access-Control-Allow-Origin',value:'*'}]}];}};
export default config;
