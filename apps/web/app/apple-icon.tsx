import{ImageResponse}from'next/og';
export const size={width:180,height:180};export const contentType='image/png';
export default function Icon(){return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#193d34',color:'#fff',fontSize:125,fontWeight:700}}>J<span style={{fontSize:65,color:'#ee7947',marginLeft:-12,marginTop:-65}}>↗</span></div>,size);}
