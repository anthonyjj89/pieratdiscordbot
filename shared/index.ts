import { Model } from 'mongoose';
import { User, Organization, Report } from './types/models';
import { models as dbModels } from './models';

// Export all types
export * from './types/models';

// Export MongoDB models
export const models = dbModels;

// Export type aliases for convenience
export type UserModel = Model<User>;
export type OrganizationModel = Model<Organization>;
export type ReportModel = Model<Report>;

// Export MongoDB document types
export type UserDocument = User & Document;
export type OrganizationDocument = Organization & Document;
export type ReportDocument = Report & Document;
