import { relations } from 'drizzle-orm';
import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// 1. users
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  passwordHash: text('password_hash'),
  role: text('role').notNull().default('PENDING'), // ADMIN, MEMBER_MANAGER, VIEWER, PENDING
  isEmailVerified: boolean('is_email_verified').notNull().default(false),
  isApproved: boolean('is_approved').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  emailVerificationToken: text('email_verification_token'),
  emailVerificationExpires: timestamp('email_verification_expires'),
  passwordResetToken: text('password_reset_token'),
  passwordResetExpires: timestamp('password_reset_expires'),
  memberId: integer('member_id'),
  lastLoginAt: timestamp('last_login_at'),
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockoutUntil: timestamp('lockout_until'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 14. email_notifications
export const emailNotifications = pgTable('email_notifications', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  type: text('type').notNull(), // VERIFICATION, PASSWORD_RESET
  token: text('token').notNull(),
  subject: text('subject').notNull(),
  content: text('content').notNull(),
  actionUrl: text('action_url').notNull(),
  isUsed: boolean('is_used').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. roles
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. team_positions
export const teamPositions = pgTable('team_positions', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. accreditations
export const accreditations = pgTable('accreditations', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  organization: text('organization'),
  validityMonths: integer('validity_months'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. event_types
export const eventTypes = pgTable('event_types', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  badgeColor: text('badge_color'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 6. members
export const members = pgTable(
  'members',
  {
    id: serial('id').primaryKey(),
    memberNo: text('member_no').notNull().unique(),
    photoUrl: text('photo_url'),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    idNumber: text('id_number').notNull().unique(), // T.C. Kimlik No
    birthDate: text('birth_date'),
    birthPlace: text('birth_place'),
    fatherName: text('father_name'),
    gender: text('gender'),
    bloodType: text('blood_type'),
    city: text('city').notNull().default('İstanbul'),
    district: text('district').notNull(),
    address: text('address'),
    phone: text('phone').notNull(),
    email: text('email'),
    teamPosition: text('team_position').notNull().default('Ekip Üyesi'),
    joinDate: text('join_date').notNull(),
    responsibilityArea: text('responsibility_area'),
    dutyStation: text('duty_station'),
    dutyTitle: text('duty_title'),
    branch: text('branch'),
    radioCallSign: text('radio_call_sign'),
    status: text('status').notNull().default('Aktif'), // Aktif, Pasif
    educationLevel: text('education_level'),
    drivingLicense: text('driving_license').notNull().default('Var'),
    drivingLicenseClasses: text('driving_license_classes'),
    srcCertificate: text('src_certificate').notNull().default('Yok'),
    srcCertificateType: text('src_belge_turu'),
    passportStatus: text('passport_status').notNull().default('Yok'),
    passportNumber: text('passport_number'),
    disabilityStatus: text('disability_status').notNull().default('Yok'),
    shoeSize: integer('shoe_size'),
    shirtSize: text('shirt_size').default('L'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    uniqueIndex('members_member_no_idx').on(table.memberNo),
    uniqueIndex('members_id_number_idx').on(table.idNumber),
  ]
);

// 7. member_emergency_contacts
export const memberEmergencyContacts = pgTable('member_emergency_contacts', {
  id: serial('id').primaryKey(),
  memberId: integer('member_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  contactName: text('contact_name').notNull(),
  contactPhone: text('contact_phone').notNull(),
  relationshipDegree: text('relationship_degree').notNull(),
  isPrimary: boolean('is_primary').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 8. member_health_records
export const memberHealthRecords = pgTable('member_health_records', {
  id: serial('id').primaryKey(),
  memberId: integer('member_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' })
    .unique(),
  chronicDiseases: text('chronic_diseases'),
  allergies: text('allergies'),
  pastSurgeries: text('past_surgeries'),
  prosthetics: text('prosthetics'),
  regularMedications: text('regular_medications'),
  bloodGroupVerified: boolean('blood_group_verified').default(false),
  additionalNotes: text('additional_notes'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 9. member_accreditations
export const memberAccreditations = pgTable('member_accreditations', {
  id: serial('id').primaryKey(),
  memberId: integer('member_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  accreditationId: integer('accreditation_id')
    .notNull()
    .references(() => accreditations.id, { onDelete: 'cascade' }),
  issueDate: text('issue_date'),
  expiryDate: text('expiry_date'),
  certificateNumber: text('certificate_number'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 10. events
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  eventType: text('event_type').notNull(), // Eğitim, Tatbikat, Operasyon
  startDateTime: text('start_date_time').notNull(), // YYYY-MM-DDTHH:mm
  endDateTime: text('end_date_time').notNull(),
  city: text('city').notNull().default('İstanbul'),
  district: text('district').notNull(),
  locationDetail: text('location_detail'),
  description: text('description'),
  status: text('status').notNull().default('Planlanan'), // Planlanan, Devam Ediyor, Tamamlandı, İptal Edildi
  coordinatorId: integer('coordinator_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 11. event_participants
export const eventParticipants = pgTable('event_participants', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  memberId: integer('member_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('Ekip Üyesi'), // Ekip Sorumlusu, Ekip Üyesi
  notes: text('notes'),
  attended: boolean('attended').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 12. audit_logs
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: text('user_id'),
  userEmail: text('user_email'),
  action: text('action').notNull(), // CREATE, UPDATE, DELETE, VIEW_HEALTH, EXPORT, LOGIN
  entityType: text('entity_type').notNull(), // MEMBER, EVENT, HEALTH_RECORD, SYSTEM, ACCREDITATION
  entityId: text('entity_id'),
  details: text('details'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 13. system_settings
export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  settingKey: text('setting_key').notNull().unique(),
  settingValue: text('setting_value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 15. saved_reports
export const savedReports = pgTable('saved_reports', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').notNull().default('Özel Rapor Oluşturucu'),
  dataSource: text('data_source').notNull().default('members'), // members, events, participations
  selectedColumns: text('selected_columns').notNull(), // JSON array
  filters: text('filters').notNull(), // JSON object
  sortField: text('sort_field'),
  sortOrder: text('sort_order').default('ASC'), // ASC, DESC
  groupBy: text('group_by'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const membersRelations = relations(members, ({ one, many }) => ({
  emergencyContacts: many(memberEmergencyContacts),
  healthRecord: one(memberHealthRecords, {
    fields: [members.id],
    references: [memberHealthRecords.memberId],
  }),
  accreditations: many(memberAccreditations),
  participations: many(eventParticipants),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  participants: many(eventParticipants),
}));

export const eventParticipantsRelations = relations(eventParticipants, ({ one }) => ({
  event: one(events, {
    fields: [eventParticipants.eventId],
    references: [events.id],
  }),
  member: one(members, {
    fields: [eventParticipants.memberId],
    references: [members.id],
  }),
}));

export const memberAccreditationsRelations = relations(memberAccreditations, ({ one }) => ({
  member: one(members, {
    fields: [memberAccreditations.memberId],
    references: [members.id],
  }),
  accreditation: one(accreditations, {
    fields: [memberAccreditations.accreditationId],
    references: [accreditations.id],
  }),
}));
