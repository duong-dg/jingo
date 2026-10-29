import {z} from 'zod';
const num=(min:number,max:number)=>z.number().finite().min(min).max(max);
const condition=z.object({code:z.number().int(),text:z.string().max(200)});
const day=z.object({maxtemp_c:num(-90,65),mintemp_c:num(-90,65),maxwind_kph:num(0,500),totalprecip_mm:num(0,2000),avghumidity:num(0,100),avgvis_km:num(0,1000),daily_chance_of_rain:z.coerce.number().min(0).max(100),uv:num(0,30),condition});
export const forecastSchema=z.object({current:z.object({temp_c:num(-90,65),is_day:z.number().int().min(0).max(1).optional(),condition,last_updated_epoch:z.number().int().positive()}),forecast:z.object({forecastday:z.array(z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),day,hour:z.array(z.object({time:z.string(),temp_c:num(-90,65),chance_of_rain:z.coerce.number().min(0).max(100)})).max(24).default([])})).min(1).max(14)})});
export type WeatherDay={date:string;min:number;max:number;rain:number;precip:number;wind:number;humidity:number;visibility:number;uv:number;code:number;eveningMin?:number;eveningRain?:number};
export type WeatherAdvice={id:string;vi:string;en:string};
export function weatherAdvice(d:WeatherDay):WeatherAdvice[]{
 const tips:WeatherAdvice[]=[];const add=(id:string,vi:string,en:string)=>tips.push({id,vi,en});
 const thunder=[1087,1273,1276,1279,1282].includes(d.code);
 if(thunder)add('thunder','Có dự báo dông. Kiểm tra thông báo của đơn vị tổ chức trước các hoạt động ngoài trời, trên núi hoặc trên biển.','Thunderstorms are forecast. Check operator updates before outdoor, mountain or sea activities.');
 if(d.wind>=40)add('wind-strong','Gió khá mạnh; kiểm tra tình trạng vận hành của tàu, tour biển hoặc cáp treo trước khi khởi hành.','Strong winds are forecast; check boat, sea tour or cable car operating updates before departure.');
 else if(d.wind>=25)add('wind','Có gió; giữ chắc mũ và đồ dùng nhẹ khi tham quan ngoài trời.','Breezy conditions: secure hats and lightweight belongings outdoors.');
 if(d.precip>=30)add('heavy-rain','Lượng mưa dự báo khá lớn. Dự phòng thời gian di chuyển và theo dõi thông báo tại điểm đến.','Substantial rainfall is forecast. Allow extra travel time and follow destination updates.');
 else if(d.rain>=60)add('rain','Khả năng mưa cao; mang áo mưa gọn và túi chống nước cho điện thoại.','Rain is likely; bring a compact raincoat and a waterproof phone pouch.');
 else if(d.rain>=30)add('showers','Có thể có mưa rào; mang ô hoặc áo mưa nhẹ để chủ động lịch trình.','Showers are possible; pack an umbrella or light raincoat for a flexible itinerary.');
 if(d.max>=35)add('hot','Trời nóng; mang nước, đội mũ và ưu tiên tham quan sáng sớm hoặc chiều muộn.','Hot weather: bring water and a hat, and favour early morning or late afternoon visits.');
 else if(d.max>=30&&d.humidity>=80)add('muggy','Thời tiết có thể oi ẩm; chọn trang phục thoáng và dành thời gian nghỉ giữa các hoạt động.','Conditions may feel humid and muggy; wear breathable clothing and take breaks between activities.');
 else if(d.max>=30)add('warm','Trời khá ấm; chuẩn bị nước uống và quần áo nhẹ khi đi bộ tham quan.','Warm weather: pack drinking water and lightweight clothes for walking tours.');
 if(d.min<=15)add('cold','Sáng sớm hoặc tối có thể lạnh; chuẩn bị áo khoác và kiểm tra dự báo theo giờ trước khi đi.','Early mornings or evenings may be cold; pack a jacket and check hourly forecasts before leaving.');
 else if(d.min<=20)add('cool','Mang thêm áo khoác nhẹ nếu đi sớm, về muộn hoặc tham quan vùng cao.','Bring a light jacket for early starts, late returns or visits to higher ground.');
 if(d.uv>=8)add('uv-very-high','UV dự báo rất cao; ưu tiên bóng râm và chuẩn bị mũ, kính, kem chống nắng.','Very high UV is forecast; favour shade and bring a hat, sunglasses and sunscreen.');
 else if(d.uv>=6)add('uv-high','UV dự báo cao dù có thể nhiều mây; chuẩn bị đồ chống nắng khi ở ngoài trời.','High UV is forecast even if cloudy; prepare sun protection for time outdoors.');
 if(d.visibility<2)add('visibility','Tầm nhìn có thể hạn chế; lưu ý thời gian di chuyển và kiểm tra dự báo tại điểm ngắm cảnh.','Visibility may be limited; allow for travel delays and check conditions at viewpoints.');
 if((d.eveningRain??0)>=60&&d.rain<60)add('evening-rain','Buổi tối có khả năng mưa; chuẩn bị áo mưa nếu xem show ngoài trời.','Evening rain is possible; bring a raincoat for outdoor shows.');
 if(d.eveningMin!==undefined&&d.max-d.eveningMin>=10&&d.min>20)add('evening-cool','Nhiệt độ buổi tối giảm so với ban ngày; mang thêm một lớp áo mỏng khi về muộn.','Evenings may be noticeably cooler; bring an extra light layer for a late return.');
 if(d.humidity>=90&&d.rain>=30)add('damp','Độ ẩm cao và có khả năng mưa; chọn giày dễ khô, cẩn thận ở lối đi ướt.','High humidity and possible rain: choose quick-drying footwear and take care on wet paths.');
 if(d.rain<30&&d.precip<5&&d.min>=20&&d.max<30&&d.wind<25&&d.uv<6&&(d.eveningRain??0)<30&&!thunder&&d.visibility>=2)add('pleasant','Dự báo khá dễ chịu, ít khả năng mưa; có thể cân nhắc đi bộ và tham quan ngoài trời.','The forecast looks mild with a low chance of rain; consider walking and outdoor sightseeing.');
 if(!tips.length)add('prepare','Kiểm tra lại dự báo gần giờ đi và chuẩn bị trang phục phù hợp với lịch trình.','Check the forecast again close to departure and dress for your itinerary.');
 // Highest-priority conditions first; keep the page concise without contradicting adverse conditions.
 return tips.slice(0,3);
}
export function normalizeForecast(input:unknown,now=Date.now()){
 const raw=forecastSchema.parse(input),today=new Date(now).toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
 const days:WeatherDay[]=raw.forecast.forecastday.filter(f=>f.date>=today).slice(0,3).map(f=>{const d=f.day,e=f.hour.filter(h=>{const hour=Number(h.time.slice(11,13));return hour>=18&&hour<=22;});return{date:f.date,min:d.mintemp_c,max:d.maxtemp_c,rain:d.daily_chance_of_rain,precip:d.totalprecip_mm,wind:d.maxwind_kph,humidity:d.avghumidity,visibility:d.avgvis_km,uv:d.uv,code:d.condition.code,...(e.length?{eveningMin:Math.min(...e.map(h=>h.temp_c)),eveningRain:Math.max(...e.map(h=>h.chance_of_rain))}:{})};});
 if(!days.length||now-raw.current.last_updated_epoch*1000>4*3600000||raw.current.last_updated_epoch*1000>now+3600000)throw new Error('Outdated weather');
 return{updatedAt:new Date(raw.current.last_updated_epoch*1000).toISOString(),current:{temperature:raw.current.temp_c,isDay:raw.current.is_day!==0,code:raw.current.condition.code},days};
}
