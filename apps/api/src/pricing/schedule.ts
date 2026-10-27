import{z}from'zod';
export const slotSchema=z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),start:z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),end:z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).optional()}).strict().refine(slot=>!slot.end||slot.end>slot.start,'Giờ kết thúc phải sau giờ bắt đầu trong cùng ngày.');
export type TimeSlot=z.infer<typeof slotSchema>;
export function checkSchedule(variant:{timeSlots?:TimeSlot[]},date:string,slotId?:string,now=Date.now()){
 const slots=variant.timeSlots||[];
 if(!slots.length){if(slotId)throw new Error('Gói này không sử dụng khung giờ.');return undefined;}
 const slot=slots.find(slot=>slot.id===slotId);if(!slot)throw new Error('Chọn khung giờ sử dụng.');
 if(now>=new Date(`${date}T${slot.start}:00+07:00`).getTime())throw new Error('Đã quá giờ bắt đầu. Vui lòng chọn khung giờ hoặc ngày khác.');
 return {...slot,requiresSelection:slots.length>1};
}
