import{BadRequestException}from'@nestjs/common';
import{calculateQuote}from'../pricing/pricing';
import{PriceGroup}from'./partners.schema';
export function applyNetPricing(retail:ReturnType<typeof calculateQuote>,group:PriceGroup){
  if(group.status!=='ACTIVE')throw new BadRequestException('Bảng giá CTV tạm ngừng.');
  const lines=retail.lines.map(line=>{
    const rules=group.rules.filter(rule=>rule.productId===retail.productId&&rule.variantId===retail.variantId&&rule.customerType===line.customerType&&rule.startDate<=retail.date&&retail.date<=rule.endDate).sort((a,b)=>b.priority-a.priority);
    if(rules.length>1&&rules[0].priority===rules[1].priority)throw new BadRequestException('Giá CTV bị xung đột.');
    if(group.pricingMode==='DIRECT'&&!rules.length)throw new BadRequestException('Chưa có giá cấp CTV cho gói / nhóm khách trong ngày này.');
    const unitPrice=rules[0]?.amount??(group.discountType==='AMOUNT'?Math.max(0,line.unitPrice-group.discountValue):Math.floor(line.unitPrice*(10000-group.discountValue)/10000));
    return{customerType:line.customerType,quantity:line.quantity,unitPrice,subtotal:unitPrice*line.quantity};
  });
  return{...(retail.timeSlot?{timeSlot:retail.timeSlot}:{}),productId:retail.productId,productName:retail.productName,variantId:retail.variantId,variantName:retail.variantName,date:retail.date,currency:retail.currency,demo:retail.demo,lines,total:lines.reduce((sum,line)=>sum+line.subtotal,0)};
}
