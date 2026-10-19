import {useState} from 'react';
import type {ImgHTMLAttributes} from 'react';
import {brandMedia} from '../data/brandMedia';

/** Swap to a persistent, real image if available; fall back cleanly when the asset isn't deployed yet. */
export default function BrandImage({project,kind='cover',...props}:{project:string;kind?:'cover'|'logo'}&Omit<ImgHTMLAttributes<HTMLImageElement>,'src'>){
 const asset=brandMedia[project];
 const main=asset?.[kind]??'/project-covers/'+project+'.svg';
 const backup=asset?.[kind==='logo'?'fallbackLogo':'backup']??'/project-marks/'+project+'.svg';
 const [path,setPath]=useState(main);
 return <img {...props} src={path} onError={event=>{if(path!==backup)setPath(backup);props.onError?.(event);}}/>;
}
