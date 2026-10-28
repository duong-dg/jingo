export type GuestType = 'ADULT' | 'CHILD' | 'SENIOR' | 'LOCAL_ADULT' | 'LOCAL_CHILD' | 'LOCAL_SENIOR';
export const guestLabels: Record<string,string> = { ADULT:'Người lớn', CHILD:'Trẻ em', SENIOR:'Người cao tuổi', LOCAL_ADULT:'Người lớn · Địa phương', LOCAL_CHILD:'Trẻ em · Địa phương', LOCAL_SENIOR:'Người cao tuổi · Địa phương' };
const english: Record<string,string> = { ADULT:'Adult', CHILD:'Child', SENIOR:'Senior', LOCAL_ADULT:'Local adult', LOCAL_CHILD:'Local child', LOCAL_SENIOR:'Local senior' };
export function guestLabel(type:string,en=false){return (en?english:guestLabels)[type] || type;}
