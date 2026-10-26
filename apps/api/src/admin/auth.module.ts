import { CanActivate, ExecutionContext, Injectable, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    if (!['GET','HEAD'].includes(req.method)) this.auth.checkMutation(req);
    req.admin = await this.auth.requireAdmin(req);
    return true;
  }
}
@Module({providers:[AuthService,AdminGuard],exports:[AuthService,AdminGuard]})
export class AuthModule {}
