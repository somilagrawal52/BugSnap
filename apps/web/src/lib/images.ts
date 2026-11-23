import sharp from 'sharp';
import {MAX_IMAGE_BYTES} from '@bugsnap/shared';
export function imageType(bytes:Buffer) {
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'jpeg';
 if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return 'webp';
 throw new Error('Unsupported image content');
}
export async function sanitizeImage(bytes:Buffer) {
 if(!bytes.length||bytes.length>MAX_IMAGE_BYTES)throw new Error('Screenshot must be at most 5 MB');
 imageType(bytes);
 const image=sharp(bytes,{limitInputPixels:25000000,animated:false});const meta=await image.metadata();
 if((meta.pages??1)>1)throw new Error('Animated images are not supported');
 const data=await image.rotate().webp({quality:85}).toBuffer(); // Re-encoding drops EXIF and other metadata.
 if(data.length>MAX_IMAGE_BYTES)throw new Error('Processed screenshot is too large');
 return {data,mime:'image/webp',extension:'webp'};
}
