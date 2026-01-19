import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { App } from 'firebase-admin/app';
import { Auth } from 'firebase-admin/auth';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: App;
  private auth: Auth;

  constructor(private readonly configService: ConfigService) { }

  async onModuleInit(): Promise<void> {
    try {
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const privateKey = this.configService
        .get<string>('FIREBASE_PRIVATE_KEY')
        ?.replace(/\\n/g, '\n');
      const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');

      if (!projectId || !privateKey || !clientEmail) {
        this.logger.warn(
          'Firebase configuration incomplete. Auth features will be limited.',
        );
        return;
      }

      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey,
          clientEmail,
        }),
      });

      this.auth = admin.auth(this.app);

      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error);
      throw error;
    }
  }

  getAuth(): Auth {
    if (!this.auth) {
      throw new Error('Firebase Auth is not initialized');
    }
    return this.auth;
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      const decodedToken = await this.auth.verifyIdToken(idToken);
      this.logger.debug(`Token verified for user: ${decodedToken.uid}`);
      return decodedToken;
    } catch (error) {
      this.logger.error('Token verification failed', error);
      throw error;
    }
  }

  async getUserByUid(uid: string): Promise<admin.auth.UserRecord> {
    try {
      return await this.auth.getUser(uid);
    } catch (error) {
      this.logger.error(`Failed to get user by UID: ${uid}`, error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<admin.auth.UserRecord> {
    try {
      return await this.auth.getUserByEmail(email);
    } catch (error) {
      this.logger.error(`Failed to get user by email: ${email}`, error);
      throw error;
    }
  }

  async createUser(email: string, password: string): Promise<admin.auth.UserRecord> {
    try {
      const userRecord = await this.auth.createUser({
        email,
        password,
        emailVerified: false,
      });
      this.logger.log(`Firebase user created: ${userRecord.uid}`);
      return userRecord;
    } catch (error) {
      this.logger.error('Failed to create Firebase user', error);
      throw error;
    }
  }

  async updateUser(
    uid: string,
    updateData: admin.auth.UpdateRequest,
  ): Promise<admin.auth.UserRecord> {
    try {
      const userRecord = await this.auth.updateUser(uid, updateData);
      this.logger.log(`Firebase user updated: ${uid}`);
      return userRecord;
    } catch (error) {
      this.logger.error(`Failed to update Firebase user: ${uid}`, error);
      throw error;
    }
  }

  async deleteUser(uid: string): Promise<void> {
    try {
      await this.auth.deleteUser(uid);
      this.logger.log(`Firebase user deleted: ${uid}`);
    } catch (error) {
      this.logger.error(`Failed to delete Firebase user: ${uid}`, error);
      throw error;
    }
  }

  async setCustomClaims(uid: string, claims: object): Promise<void> {
    try {
      await this.auth.setCustomUserClaims(uid, claims);
      this.logger.log(`Custom claims set for user: ${uid}`);
    } catch (error) {
      this.logger.error(`Failed to set custom claims for user: ${uid}`, error);
      throw error;
    }
  }

  async revokeRefreshTokens(uid: string): Promise<void> {
    try {
      await this.auth.revokeRefreshTokens(uid);
      this.logger.log(`Refresh tokens revoked for user: ${uid}`);
    } catch (error) {
      this.logger.error(`Failed to revoke refresh tokens for user: ${uid}`, error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return !!this.auth;
  }
}
