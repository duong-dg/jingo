import{z}from'zod';
export const permissions=['SELL','COLLECT','DELIVER','PRINT','CANCEL']as const;
export type PosPermission=typeof permissions[number];
export const posUserSchema=z.object({id:z.uuid(),name:z.string().trim().min(1).max(100),email:z.email().max(200).transform(value=>value.toLowerCase()),status:z.enum(['ACTIVE','DISABLED']),counterIds:z.array(z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/)).max(50),permissions:z.array(z.enum(permissions)).max(5),version:z.number().int().min(0),password:z.string().min(12).max(200).optional()}).strict().superRefine((user,ctx)=>{if(user.status==='ACTIVE'&&!user.counterIds.length)ctx.addIssue({code:'custom',message:'Gán ít nhất một quầy cho tài khoản hoạt động.'});if(new Set(user.counterIds).size!==user.counterIds.length||new Set(user.permissions).size!==user.permissions.length)ctx.addIssue({code:'custom',message:'Quầy hoặc quyền bị trùng.'});});
export type PosUser=Omit<z.infer<typeof posUserSchema>,'password'>;
export type PosActor={id:string;email:string;name:string;role:'ADMIN'|'STAFF';counterIds:string[];permissions:PosPermission[]};
export const posLoginSchema=z.object({email:z.email().max(200).transform(value=>value.trim().toLowerCase()),password:z.string().min(1).max(200)}).strict();
