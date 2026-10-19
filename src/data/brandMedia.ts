/**
 * Assets supplied by the portfolio owner.
 * Public images under /project-media are preferred when deployed;
 * existing live repository assets are used as durable fallbacks.
 * No expiring CDN/attachment links.
 */
export const brandMedia:Record<string,{cover:string;backup:string;logo:string;fallbackLogo:string;gallery:{src:string;title:string}[]}>={
 privacygate:{
  cover:'/project-media/privacygate-protect.webp',
  backup:'https://raw.githubusercontent.com/patpet21/ai-pm-lab-privacy-gate/main/web-demo/assets/workflow-how-privacy-gate-works.png',
  logo:'/project-media/privacygate-logo.webp',
  fallbackLogo:'https://raw.githubusercontent.com/patpet21/ai-pm-lab-privacy-gate/main/resources/branding/privacy-gate-icon.png',
  gallery:[
   {src:'/project-media/privacygate-protect.webp',title:'Protect sensitive information locally'},
   {src:'/project-media/privacygate-restore.webp',title:'Restore protected information'},
   {src:'/project-media/privacygate-mcp.webp',title:'MCP and AI direct connections'},
   {src:'/project-media/privacygate-banner.webp',title:'PrivacyGate brand'},
   {src:'/project-media/privacygate-gmail.webp',title:'Gmail Add-on'},
   {src:'/project-media/privacygate-edge.webp',title:'Edge extension'},
   {src:'/project-media/privacygate-store.webp',title:'Microsoft Store'}
  ]
 },
 privatestone:{cover:'/project-covers/privatestone.svg',backup:'/project-covers/privatestone.svg',logo:'/project-marks/privatestone.svg',fallbackLogo:'/project-marks/privatestone.svg',gallery:[]},
 propertydex:{cover:'/project-media/propertydex-symbol.webp',backup:'/project-covers/propertydex.svg',logo:'/project-media/propertydex-symbol.webp',fallbackLogo:'/project-marks/propertydex.svg',gallery:[{src:'/project-media/propertydex-symbol.webp',title:'PropertyDEX visual identity'}]},
 'propertydex-framework':{cover:'/project-media/propertydex-framework.webp',backup:'/project-covers/propertydex-framework.svg',logo:'/project-media/propertydex-symbol.webp',fallbackLogo:'/project-marks/propertydex-framework.svg',gallery:[{src:'/project-media/propertydex-framework.webp',title:'PropertyDEX Framework brand identity'},{src:'/project-media/propertydex-symbol.webp',title:'PropertyDEX mark'}]},
 websites:{cover:'/project-covers/websites.svg',backup:'/project-covers/websites.svg',logo:'/project-marks/websites.svg',fallbackLogo:'/project-marks/websites.svg',gallery:[]},
 'retail-it':{cover:'/project-covers/retail-it.svg',backup:'/project-covers/retail-it.svg',logo:'/project-marks/retail-it.svg',fallbackLogo:'/project-marks/retail-it.svg',gallery:[]},
 'lead-rescue':{cover:'/project-covers/lead-rescue.svg',backup:'/project-covers/lead-rescue.svg',logo:'/project-marks/lead-rescue.svg',fallbackLogo:'/project-marks/lead-rescue.svg',gallery:[]},
 'e-learning':{cover:'/project-media/ai-pm-lab.webp',backup:'https://raw.githubusercontent.com/patpet21/aipmlab_link/main/assets/og-image.png',logo:'/project-media/ai-pm-lab.webp',fallbackLogo:'https://raw.githubusercontent.com/patpet21/aipmlab_link/main/assets/logo-ai-pm-lab.png',gallery:[{src:'/project-media/ai-pm-lab.webp',title:'AI PM Lab identity'},{src:'/project-media/trigosat-consulting.webp',title:'Trigosat Consulting brand'}]},
 'n8n-automation':{cover:'/project-media/n8n-workflow-detail.webp',backup:'/project-covers/lead-rescue.svg',logo:'/project-marks/lead-rescue.svg',fallbackLogo:'/project-marks/lead-rescue.svg',gallery:[{src:'/project-media/n8n-workflow-detail.webp',title:'n8n Drive cleanup verification workflow'},{src:'/project-media/n8n-workflow-overview.webp',title:'Full multi-flow n8n workspace'}]}
};
