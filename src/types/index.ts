export type UserRole = 'ADMIN' | 'MEMBER_MANAGER' | 'VIEWER' | 'PENDING';

export interface User {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  isEmailVerified: boolean;
  isApproved: boolean;
  isActive: boolean;
  memberId?: number | null;
  createdAt: string;
}

export interface EmergencyContact {
  id?: number;
  memberId?: number;
  contactName: string;
  contactPhone: string;
  relationshipDegree: string;
  isPrimary?: boolean;
}

export interface HealthRecord {
  id?: number;
  memberId?: number;
  chronicDiseases: string | null;
  allergies: string | null;
  pastSurgeries: string | null;
  prosthetics: string | null;
  regularMedications: string | null;
  bloodGroupVerified: boolean;
  additionalNotes: string | null;
  updatedAt?: string;
}

export interface MemberAccreditation {
  id?: number;
  accreditationId: number;
  name?: string;
  code?: string;
  organization?: string;
  issueDate?: string;
  expiryDate?: string;
  certificateNumber?: string;
}

export interface Member {
  id: number;
  memberNo: string;
  photoUrl: string | null;
  firstName: string;
  lastName: string;
  idNumber: string; // T.C. Kimlik
  birthDate: string | null;
  birthPlace: string | null;
  fatherName: string | null;
  gender: string | null;
  bloodType: string | null;
  city: string;
  district: string;
  address: string | null;
  phone: string;
  email: string | null;
  teamPosition: string;
  joinDate: string;
  responsibilityArea: string | null;
  dutyStation: string | null;
  dutyTitle: string | null;
  branch: string | null;
  radioCallSign: string | null;
  status: 'Aktif' | 'Pasif';
  educationLevel: string | null;
  drivingLicense: string;
  drivingLicenseClasses: string | null;
  srcCertificate: string;
  srcCertificateType?: string | null;
  src_belge_turu?: string | null;
  passportStatus: string;
  passportNumber: string | null;
  disabilityStatus: string;
  shoeSize: number | null;
  shirtSize: string | null;
  notes: string | null;
  accreditationIds?: number[];
  createdAt?: string;
  updatedAt?: string;
  accreditations?: string[] | MemberAccreditation[];
  emergencyContacts?: EmergencyContact[];
  healthRecord?: HealthRecord | null;
  participations?: EventParticipation[];
}

export interface EventParticipation {
  id?: number;
  eventId?: number;
  memberId?: number;
  title?: string;
  eventType?: string;
  startDateTime?: string;
  endDateTime?: string;
  city?: string;
  district?: string;
  role: 'Ekip Sorumlusu' | 'Ekip Üyesi';
  status?: string;
  attended?: boolean;
  notes?: string | null;
  memberNo?: string;
  firstName?: string;
  lastName?: string;
  teamPosition?: string;
  phone?: string;
  photoUrl?: string | null;
  branch?: string | null;
}

export interface TeamEvent {
  id: number;
  title: string;
  eventType: 'Eğitim' | 'Tatbikat' | 'Operasyon' | string;
  startDateTime: string;
  endDateTime: string;
  city: string;
  district: string;
  locationDetail: string | null;
  description: string | null;
  status: 'Planlanan' | 'Devam Ediyor' | 'Tamamlandı' | 'İptal Edildi';
  coordinatorId?: number | null;
  coordinatorName?: string;
  participantCount?: number;
  participants?: EventParticipation[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Accreditation {
  id: number;
  code: string;
  name: string;
  organization: string | null;
  validityMonths: number | null;
  description: string | null;
  memberCount?: number;
  members?: any[];
}

export interface TeamPosition {
  id: number;
  name: string;
  description: string | null;
  isDefault: boolean;
}

export interface EventType {
  id: number;
  name: string;
  badgeColor: string | null;
  description: string | null;
}

export interface AuditLog {
  id: number;
  userId: string | null;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface DashboardReport {
  totalMembers: number;
  activeMembers: number;
  passiveMembers: number;
  totalEvents: number;
  upcomingEvents: number;
  ongoingEvents: number;
  completedEvents: number;
  positionCounts: Record<string, number>;
  bloodTypeCounts: Record<string, number>;
  districtCounts: Record<string, number>;
  shirtSizeCounts: Record<string, number>;
  shoeSizeCounts: Record<string, number>;
  recentEvents: TeamEvent[];
  recentMembers: Member[];
  topMembers: {
    memberId: number;
    count: number;
    name: string;
    position: string;
    photoUrl: string | null;
  }[];
  totalAccreditedAssignments: number;
}

export type ReportCategoryType =
  | 'member_reports' // 1. Üye Raporları
  | 'team_position_reports' // 2. Ekip ve Görev Raporları
  | 'accreditation_reports' // 3. Akreditasyon ve Eğitim Raporları
  | 'event_reports' // 4. Etkinlik Raporları
  | 'participation_reports' // 5. Etkinlik Katılım Raporları
  | 'emergency_reports' // 6. İletişim ve Acil Durum Raporları
  | 'equipment_reports' // 7. Kıyafet ve Ekipman Raporları
  | 'custom_reports'; // 8. Özel Rapor Oluşturucu

export interface ReportColumnDef {
  key: string;
  label: string;
  category: string;
  isSensitive?: boolean;
  defaultSelected?: boolean;
  type?: 'text' | 'date' | 'number' | 'phone' | 'badge' | 'list';
}

export interface ReportFilterState {
  // Member filters
  search?: string;
  firstName?: string;
  lastName?: string;
  memberNo?: string;
  status?: string; // 'Tümü' | 'Aktif' | 'Pasif'
  teamPosition?: string | string[];
  joinDateStart?: string;
  joinDateEnd?: string;
  birthDateStart?: string;
  birthDateEnd?: string;
  ageMin?: number;
  ageMax?: number;
  gender?: string;
  bloodType?: string;
  educationLevel?: string;
  district?: string;
  city?: string;
  dutyStation?: string;
  dutyTitle?: string;
  branch?: string;
  responsibilityArea?: string;
  disabilityStatus?: string;
  drivingLicense?: string;
  drivingLicenseClasses?: string;
  srcCertificate?: string;
  srcCertificateType?: string;
  passportStatus?: string;
  shoeSize?: number;
  shoeSizeMin?: number;
  shoeSizeMax?: number;
  shirtSize?: string;

  // Accreditation & training filters
  hasAccreditation?: 'all' | 'yes' | 'no';
  accreditationIds?: number[];
  accreditationMatchMode?: 'ANY' | 'ALL'; // OR vs AND
  specificAccreditationName?: string;
  attendedSpecificEventId?: number;
  neverAttendedAnyEvent?: boolean;
  trainingDateStart?: string;
  trainingDateEnd?: string;

  // Event filters
  eventTitle?: string;
  eventType?: string; // Eğitim, Tatbikat, Operasyon
  eventStartDate?: string;
  eventEndDate?: string;
  eventCity?: string;
  eventDistrict?: string;
  eventStatus?: string; // Planlanan, Devam Ediyor, Tamamlandı, İptal Edildi
  minParticipants?: number;
  maxParticipants?: number;
  participantMemberId?: number;
  participantRole?: string; // Ekip Sorumlusu, Ekip Üyesi
  coordinatorId?: number;
  hasNoParticipants?: boolean;

  // Emergency & Contact filters
  hasPhone?: 'all' | 'yes' | 'no';
  hasEmail?: 'all' | 'yes' | 'no';
  hasEmergencyContact?: 'all' | 'yes' | 'no';
  hasEmergencyPhone?: 'all' | 'yes' | 'no';
  hasMissingInfo?: 'all' | 'yes';

  // Logical condition grouping for Custom Builder
  conditionMode?: 'AND' | 'OR';
  nonEmptyColumnsOnly?: string[];

  // General & Specific filter bindings
  memberId?: number | string;
  eventId?: number | string;
  startDate?: string;
  endDate?: string;
  attended?: string; // Tümü | Katıldı | Katılmadı | İzinli | Mazeretli
}

export interface ReportQueryParams {
  dataSource: 'members' | 'events' | 'participations';
  category?: string;
  templateId?: string;
  columns: string[];
  filters: ReportFilterState;
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC';
  groupBy?: string;
  page?: number;
  limit?: number;
}

export interface ReportQueryResult {
  rows: any[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  appliedFiltersSummary: string[];
  summary?: {
    totalRecords: number;
    activeCount?: number;
    passiveCount?: number;
    distributionByDistrict?: Record<string, number>;
    distributionByPosition?: Record<string, number>;
    distributionByAccreditation?: Record<string, number>;
    distributionByBloodType?: Record<string, number>;
    distributionByEventType?: Record<string, number>;
    distributionByShirtSize?: Record<string, number>;
    distributionByShoeSize?: Record<string, number>;
  };
}

export interface SavedReport {
  id: number;
  name: string;
  description: string | null;
  category: string;
  dataSource: 'members' | 'events' | 'participations';
  selectedColumns: string[];
  filters: ReportFilterState;
  sortField?: string | null;
  sortOrder?: 'ASC' | 'DESC';
  groupBy?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReadyTemplateDef {
  id: string;
  title: string;
  category: ReportCategoryType;
  description: string;
  iconName: string;
  dataSource: 'members' | 'events' | 'participations';
  defaultColumns: string[];
  defaultFilters: ReportFilterState;
  isSensitive?: boolean;
}

// -------------------------------------------------------------
// EXCEL BATCH MEMBER IMPORT TYPES
// -------------------------------------------------------------
export type BatchImportRowStatus = 'VALID' | 'WARNING' | 'ERROR' | 'MATCHED';

export interface BatchImportRow {
  rowNumber: number;
  data: Record<string, any>;
  status: BatchImportRowStatus;
  statusMessage: string;
  errors: string[];
  warnings: string[];
  matchedMemberId?: number;
  matchedMemberName?: string;
  selected: boolean;
}

export type BatchImportStrategy = 'SKIP_EXISTING' | 'UPDATE_EXISTING' | 'ABORT';

export interface BatchImportResult {
  success: boolean;
  totalProcessed: number;
  addedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  durationMs: number;
  failedRows: Array<{
    rowNumber: number;
    fullName?: string;
    reason: string;
    fields: string[];
  }>;
  message: string;
}

