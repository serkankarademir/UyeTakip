import { Request, Response } from 'express';
import { db } from '../db/index.ts';
import * as schema from '../db/schema.ts';
import { eq, desc, asc, and } from 'drizzle-orm';
import { ReportFilterState, ReportQueryParams, ReportQueryResult } from '../types/index.ts';
import { formatDateTR, formatPhoneTR } from '../lib/formatters.ts';

/**
 * Executes a full relational SQL query with deduplication,
 * multi-faceted filtering, permission checking and statistical summaries.
 */
export async function executeReportQuery(params: ReportQueryParams, userRole: string = 'ADMIN'): Promise<ReportQueryResult> {
  const {
    dataSource,
    columns = [],
    filters = {},
    sortField,
    sortOrder = 'ASC',
    groupBy,
    page = 1,
    limit = 25,
  } = params;

  // 1. Fetch raw relational data from Cloud SQL
  const [
    rawMembers,
    rawEvents,
    rawParticipants,
    rawMemberAccs,
    rawAccreditations,
    rawContacts,
    rawHealth,
  ] = await Promise.all([
    db.select().from(schema.members),
    db.select().from(schema.events),
    db.select().from(schema.eventParticipants),
    db.select().from(schema.memberAccreditations),
    db.select().from(schema.accreditations),
    db.select().from(schema.memberEmergencyContacts),
    db.select().from(schema.memberHealthRecords),
  ]);

  // Indexing maps for instant relation lookup
  const accMap = new Map<number, string>();
  rawAccreditations.forEach((a) => accMap.set(a.id, a.name));

  const memberAccMap = new Map<number, { id: number; name: string; issueDate: string | null }[]>();
  rawMemberAccs.forEach((ma) => {
    const list = memberAccMap.get(ma.memberId) || [];
    list.push({
      id: ma.accreditationId,
      name: accMap.get(ma.accreditationId) || `Akreditasyon #${ma.accreditationId}`,
      issueDate: ma.issueDate,
    });
    memberAccMap.set(ma.memberId, list);
  });

  const memberContactsMap = new Map<number, typeof rawContacts[0]>();
  rawContacts.forEach((c) => {
    if (!memberContactsMap.has(c.memberId) || c.isPrimary) {
      memberContactsMap.set(c.memberId, c);
    }
  });

  const memberHealthMap = new Map<number, typeof rawHealth[0]>();
  rawHealth.forEach((h) => memberHealthMap.set(h.memberId, h));

  const memberParticipationCounts = new Map<number, number>();
  const memberParticipationsList = new Map<number, typeof rawParticipants>();
  rawParticipants.forEach((p) => {
    memberParticipationCounts.set(p.memberId, (memberParticipationCounts.get(p.memberId) || 0) + 1);
    const list = memberParticipationsList.get(p.memberId) || [];
    list.push(p);
    memberParticipationsList.set(p.memberId, list);
  });

  const eventParticipantCounts = new Map<number, number>();
  rawParticipants.forEach((p) => {
    eventParticipantCounts.set(p.eventId, (eventParticipantCounts.get(p.eventId) || 0) + 1);
  });

  const memberMap = new Map<number, typeof rawMembers[0]>();
  rawMembers.forEach((m) => memberMap.set(m.id, m));

  const eventMap = new Map<number, typeof rawEvents[0]>();
  rawEvents.forEach((e) => eventMap.set(e.id, e));

  const appliedFiltersSummary: string[] = [];

  // -------------------------------------------------------------
  // DATA SOURCE 1: MEMBERS
  // -------------------------------------------------------------
  if (dataSource === 'members') {
    let rows = rawMembers.map((m) => {
      const accList = memberAccMap.get(m.id) || [];
      const contact = memberContactsMap.get(m.id);
      const health = memberHealthMap.get(m.id);
      const partCount = memberParticipationCounts.get(m.id) || 0;

      // Age calculation
      let age: number | null = null;
      if (m.birthDate) {
        const bYear = new Date(m.birthDate).getFullYear();
        if (!isNaN(bYear)) age = new Date().getFullYear() - bYear;
      }

      // Sensitive data masking for VIEWER
      const canViewSensitive = userRole === 'ADMIN' || userRole === 'MEMBER_MANAGER';
      const maskedIdNumber = canViewSensitive
        ? m.idNumber
        : m.idNumber ? `${m.idNumber.substring(0, 3)}*****${m.idNumber.substring(8)}` : '-';

      return {
        id: m.id,
        memberNo: m.memberNo,
        fullName: `${m.firstName} ${m.lastName}`.trim(),
        firstName: m.firstName,
        lastName: m.lastName,
        idNumber: maskedIdNumber,
        birthDate: m.birthDate ? formatDateTR(m.birthDate) : '-',
        rawBirthDate: m.birthDate,
        age: age ?? '-',
        gender: m.gender || '-',
        bloodType: m.bloodType || '-',
        birthPlace: m.birthPlace || '-',
        fatherName: m.fatherName || '-',
        teamPosition: m.teamPosition,
        status: m.status,
        joinDate: m.joinDate ? formatDateTR(m.joinDate) : '-',
        rawJoinDate: m.joinDate,
        district: m.district,
        city: m.city,
        dutyStation: m.dutyStation || '-',
        dutyTitle: m.dutyTitle || '-',
        branch: m.branch || '-',
        responsibilityArea: m.responsibilityArea || '-',
        radioCallSign: m.radioCallSign || '-',
        accreditationsList: accList.map((a) => a.name),
        accreditationIds: accList.map((a) => a.id),
        accreditationCount: accList.length,
        eventParticipationCount: partCount,
        phone: formatPhoneTR(m.phone),
        rawPhone: m.phone,
        email: m.email || '-',
        address: m.address || '-',
        emergencyContactName: canViewSensitive ? (contact?.contactName || '-') : '***',
        emergencyContactPhone: canViewSensitive && contact?.contactPhone ? formatPhoneTR(contact.contactPhone) : '***',
        emergencyContactRelation: canViewSensitive ? (contact?.relationshipDegree || '-') : '***',
        shirtSize: m.shirtSize || '-',
        shoeSize: m.shoeSize ?? '-',
        educationLevel: m.educationLevel || '-',
        drivingLicense: m.drivingLicense || 'Yok',
        drivingLicenseClasses: m.drivingLicenseClasses || '-',
        srcCertificate: m.srcCertificate || 'Yok',
        srcCertificateType: m.srcCertificate === 'Var' ? (m.srcCertificateType || '-') : 'Yok',
        passportStatus: m.passportStatus || 'Yok',
        disabilityStatus: canViewSensitive ? (m.disabilityStatus || 'Yok') : '***',
        hasContact: !!contact,
        hasHealth: !!health,
      };
    });

    // Filtering logic
    if (filters.search) {
      const q = filters.search.toLowerCase();
      appliedFiltersSummary.push(`Arama: "${filters.search}"`);
      rows = rows.filter((r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.memberNo.toLowerCase().includes(q) ||
        r.rawPhone.includes(q) ||
        r.district.toLowerCase().includes(q)
      );
    }

    if (filters.status && filters.status !== 'Tümü') {
      appliedFiltersSummary.push(`Durum: ${filters.status}`);
      rows = rows.filter((r) => r.status === filters.status);
    }

    if (filters.teamPosition) {
      const pos = Array.isArray(filters.teamPosition) ? filters.teamPosition : [filters.teamPosition];
      if (pos.length && !pos.includes('Tümü')) {
        appliedFiltersSummary.push(`Görev: ${pos.join(', ')}`);
        rows = rows.filter((r) => pos.includes(r.teamPosition));
      }
    }

    if (filters.district && filters.district !== 'Tümü') {
      appliedFiltersSummary.push(`İlçe: ${filters.district}`);
      rows = rows.filter((r) => r.district === filters.district);
    }

    if (filters.branch && filters.branch !== 'Tümü') {
      appliedFiltersSummary.push(`Branş: ${filters.branch}`);
      rows = rows.filter((r) => r.branch.toLowerCase().includes(filters.branch!.toLowerCase()));
    }

    if (filters.bloodType && filters.bloodType !== 'Tümü') {
      appliedFiltersSummary.push(`Kan Grubu: ${filters.bloodType}`);
      rows = rows.filter((r) => r.bloodType === filters.bloodType);
    }

    if (filters.gender && filters.gender !== 'Tümü') {
      appliedFiltersSummary.push(`Cinsiyet: ${filters.gender}`);
      rows = rows.filter((r) => r.gender === filters.gender);
    }

    if (filters.educationLevel && filters.educationLevel !== 'Tümü') {
      appliedFiltersSummary.push(`Öğrenim: ${filters.educationLevel}`);
      rows = rows.filter((r) => r.educationLevel === filters.educationLevel);
    }

    if (filters.dutyStation) {
      appliedFiltersSummary.push(`Görev Yeri: ${filters.dutyStation}`);
      rows = rows.filter((r) => r.dutyStation.toLowerCase().includes(filters.dutyStation!.toLowerCase()));
    }

    if (filters.responsibilityArea) {
      appliedFiltersSummary.push(`Sorumluluk: ${filters.responsibilityArea}`);
      rows = rows.filter((r) => r.responsibilityArea.toLowerCase().includes(filters.responsibilityArea!.toLowerCase()));
    }

    if (filters.drivingLicense && filters.drivingLicense !== 'Tümü') {
      appliedFiltersSummary.push(`Ehliyet: ${filters.drivingLicense}`);
      rows = rows.filter((r) => r.drivingLicense === filters.drivingLicense);
    }

    if (filters.srcCertificate && filters.srcCertificate !== 'Tümü') {
      appliedFiltersSummary.push(`SRC: ${filters.srcCertificate}`);
      rows = rows.filter((r) => r.srcCertificate === filters.srcCertificate);
    }

    if (filters.srcCertificateType && filters.srcCertificateType !== 'Tümü') {
      appliedFiltersSummary.push(`SRC Belge Türü: ${filters.srcCertificateType}`);
      rows = rows.filter((r) => r.srcCertificateType === filters.srcCertificateType);
    }

    if (filters.passportStatus && filters.passportStatus !== 'Tümü') {
      appliedFiltersSummary.push(`Pasaport: ${filters.passportStatus}`);
      rows = rows.filter((r) => r.passportStatus === filters.passportStatus);
    }

    if (filters.disabilityStatus && filters.disabilityStatus !== 'Tümü') {
      appliedFiltersSummary.push(`Engel Durumu: ${filters.disabilityStatus}`);
      rows = rows.filter((r) => r.disabilityStatus === filters.disabilityStatus);
    }

    if (filters.shirtSize && filters.shirtSize !== 'Tümü') {
      appliedFiltersSummary.push(`Tişört Bedeni: ${filters.shirtSize}`);
      rows = rows.filter((r) => r.shirtSize === filters.shirtSize);
    }

    if (filters.shoeSize) {
      appliedFiltersSummary.push(`Ayakkabı No: ${filters.shoeSize}`);
      rows = rows.filter((r) => Number(r.shoeSize) === Number(filters.shoeSize));
    }

    if (filters.ageMin !== undefined && filters.ageMin !== null) {
      appliedFiltersSummary.push(`Min Yaş: ${filters.ageMin}`);
      rows = rows.filter((r) => typeof r.age === 'number' && r.age >= filters.ageMin!);
    }
    if (filters.ageMax !== undefined && filters.ageMax !== null) {
      appliedFiltersSummary.push(`Maks Yaş: ${filters.ageMax}`);
      rows = rows.filter((r) => typeof r.age === 'number' && r.age <= filters.ageMax!);
    }

    // Specific member filter
    if (filters.memberId && filters.memberId !== 'Tümü') {
      const mId = Number(filters.memberId);
      const targetM = memberMap.get(mId);
      appliedFiltersSummary.push(`Üye: ${targetM ? targetM.firstName + ' ' + targetM.lastName : '#' + mId}`);
      rows = rows.filter((r) => r.id === mId);
    }

    // Join date range (also bound to general startDate/endDate)
    const joinStart = filters.startDate || filters.joinDateStart;
    if (joinStart) {
      appliedFiltersSummary.push(`Katılım Başlangıç: ${formatDateTR(joinStart)}`);
      rows = rows.filter((r) => r.rawJoinDate && r.rawJoinDate >= joinStart);
    }
    const joinEnd = filters.endDate || filters.joinDateEnd;
    if (joinEnd) {
      appliedFiltersSummary.push(`Katılım Bitiş: ${formatDateTR(joinEnd)}`);
      rows = rows.filter((r) => r.rawJoinDate && r.rawJoinDate <= joinEnd);
    }

    // Birth date range
    if (filters.birthDateStart) {
      appliedFiltersSummary.push(`Doğum Başlangıç: ${formatDateTR(filters.birthDateStart)}`);
      rows = rows.filter((r) => r.rawBirthDate && r.rawBirthDate >= filters.birthDateStart!);
    }
    if (filters.birthDateEnd) {
      appliedFiltersSummary.push(`Doğum Bitiş: ${formatDateTR(filters.birthDateEnd)}`);
      rows = rows.filter((r) => r.rawBirthDate && r.rawBirthDate <= filters.birthDateEnd!);
    }

    // Accreditation filter (Yes / No / Specific / Match Mode ALL vs ANY)
    if (filters.hasAccreditation === 'yes') {
      appliedFiltersSummary.push('Akreditasyonu Olanlar');
      rows = rows.filter((r) => r.accreditationCount > 0);
    } else if (filters.hasAccreditation === 'no') {
      appliedFiltersSummary.push('Akreditasyonu Olmayanlar');
      rows = rows.filter((r) => r.accreditationCount === 0);
    }

    if (filters.specificAccreditationName) {
      const sName = filters.specificAccreditationName.toLowerCase();
      appliedFiltersSummary.push(`Akreditasyon Türü: "${filters.specificAccreditationName}"`);
      rows = rows.filter((r) =>
        r.accreditationsList.some((accName) => accName.toLowerCase().includes(sName))
      );
    }

    if (filters.accreditationIds && filters.accreditationIds.length > 0) {
      const ids = filters.accreditationIds;
      const matchAll = filters.accreditationMatchMode === 'ALL';
      appliedFiltersSummary.push(
        matchAll
          ? `Tüm Seçili Akreditasyonlara Sahip (VE): ${ids.length} adet`
          : `Seçili Akreditasyonlardan Herhangi Biri (VEYA): ${ids.length} adet`
      );

      rows = rows.filter((r) => {
        if (matchAll) {
          return ids.every((id) => r.accreditationIds.includes(id));
        } else {
          return ids.some((id) => r.accreditationIds.includes(id));
        }
      });
    }

    // Event attendance filters
    if (filters.neverAttendedAnyEvent) {
      appliedFiltersSummary.push('Hiç Etkinliğe Katılmamış Üyeler');
      rows = rows.filter((r) => r.eventParticipationCount === 0);
    }

    if (filters.attendedSpecificEventId) {
      const eId = Number(filters.attendedSpecificEventId);
      const ev = eventMap.get(eId);
      appliedFiltersSummary.push(`Katıldığı Etkinlik: ${ev?.title || '#' + eId}`);
      rows = rows.filter((r) => {
        const parts = memberParticipationsList.get(r.id) || [];
        return parts.some((p) => p.eventId === eId);
      });
    }

    // Emergency Contact & Missing Data filters
    if (filters.hasPhone === 'yes') {
      rows = rows.filter((r) => r.rawPhone && r.rawPhone.replace(/\D/g, '').length >= 10);
    } else if (filters.hasPhone === 'no') {
      rows = rows.filter((r) => !r.rawPhone || r.rawPhone.replace(/\D/g, '').length < 10);
      appliedFiltersSummary.push('Telefonu Bulunmayanlar');
    }

    if (filters.hasEmail === 'yes') {
      rows = rows.filter((r) => r.email && r.email !== '-');
    } else if (filters.hasEmail === 'no') {
      rows = rows.filter((r) => !r.email || r.email === '-');
      appliedFiltersSummary.push('E-postası Bulunmayanlar');
    }

    if (filters.hasEmergencyContact === 'yes') {
      appliedFiltersSummary.push('Acil Durum İrtibatı Kayıtlı Olanlar');
      rows = rows.filter((r) => r.hasContact);
    } else if (filters.hasEmergencyContact === 'no') {
      appliedFiltersSummary.push('Acil Durum İrtibatı Bulunmayanlar');
      rows = rows.filter((r) => !r.hasContact);
    }

    if (filters.hasMissingInfo === 'yes') {
      appliedFiltersSummary.push('Bilgi Eksikliği Bulunan Üyeler');
      rows = rows.filter((r) =>
        !r.email || r.email === '-' ||
        !r.bloodType || r.bloodType === '-' ||
        !r.hasContact ||
        !r.rawPhone || r.rawPhone.length < 10
      );
    }

    // Sorting
    if (sortField) {
      rows.sort((a: any, b: any) => {
        const va = a[sortField];
        const vb = b[sortField];
        if (va === vb) return 0;
        if (va === null || va === undefined) return 1;
        if (vb === null || vb === undefined) return -1;
        const res = va > vb ? 1 : -1;
        return sortOrder === 'DESC' ? -res : res;
      });
    } else {
      // Default: sort by memberNo ASC
      rows.sort((a, b) => a.memberNo.localeCompare(b.memberNo, 'tr'));
    }

    const totalCount = rows.length;

    // Summary statistics
    const distributionByDistrict: Record<string, number> = {};
    const distributionByPosition: Record<string, number> = {};
    const distributionByAccreditation: Record<string, number> = {};
    const distributionByBloodType: Record<string, number> = {};
    const distributionByShirtSize: Record<string, number> = {};
    const distributionByShoeSize: Record<string, number> = {};
    let activeCount = 0;
    let passiveCount = 0;

    rows.forEach((r) => {
      if (r.status === 'Aktif') activeCount++;
      else passiveCount++;

      if (r.district) distributionByDistrict[r.district] = (distributionByDistrict[r.district] || 0) + 1;
      if (r.teamPosition) distributionByPosition[r.teamPosition] = (distributionByPosition[r.teamPosition] || 0) + 1;
      if (r.bloodType && r.bloodType !== '-') distributionByBloodType[r.bloodType] = (distributionByBloodType[r.bloodType] || 0) + 1;
      if (r.shirtSize && r.shirtSize !== '-') distributionByShirtSize[r.shirtSize] = (distributionByShirtSize[r.shirtSize] || 0) + 1;
      if (r.shoeSize && r.shoeSize !== '-') distributionByShoeSize[String(r.shoeSize)] = (distributionByShoeSize[String(r.shoeSize)] || 0) + 1;

      r.accreditationsList.forEach((accName) => {
        distributionByAccreditation[accName] = (distributionByAccreditation[accName] || 0) + 1;
      });
    });

    // Pagination
    const p = Math.max(1, page);
    const lim = limit > 0 ? limit : totalCount;
    const paginatedRows = limit > 0 ? rows.slice((p - 1) * lim, p * lim) : rows;

    return {
      rows: paginatedRows,
      totalCount,
      page: p,
      limit: lim,
      totalPages: limit > 0 ? Math.ceil(totalCount / lim) : 1,
      appliedFiltersSummary,
      summary: {
        totalRecords: totalCount,
        activeCount,
        passiveCount,
        distributionByDistrict,
        distributionByPosition,
        distributionByAccreditation,
        distributionByBloodType,
        distributionByShirtSize,
        distributionByShoeSize,
      },
    };
  }

  // -------------------------------------------------------------
  // DATA SOURCE 2: EVENTS
  // -------------------------------------------------------------
  if (dataSource === 'events') {
    let rows = rawEvents.map((e) => {
      const pCount = eventParticipantCounts.get(e.id) || 0;
      const coordinator = e.coordinatorId ? memberMap.get(e.coordinatorId) : null;

      return {
        id: e.id,
        title: e.title,
        eventType: e.eventType,
        status: e.status,
        startDateTime: formatDateTR(e.startDateTime, true),
        endDateTime: formatDateTR(e.endDateTime, true),
        rawStart: e.startDateTime,
        rawEnd: e.endDateTime,
        city: e.city,
        district: e.district,
        locationDetail: e.locationDetail || '-',
        coordinatorName: coordinator ? `${coordinator.firstName} ${coordinator.lastName}` : '-',
        coordinatorId: e.coordinatorId,
        participantCount: pCount,
        description: e.description || '-',
      };
    });

    if (filters.search) {
      const q = filters.search.toLowerCase();
      appliedFiltersSummary.push(`Arama: "${filters.search}"`);
      rows = rows.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.district.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          r.locationDetail.toLowerCase().includes(q) ||
          r.coordinatorName.toLowerCase().includes(q)
      );
    }

    if (filters.eventTitle) {
      appliedFiltersSummary.push(`Etkinlik Adı: "${filters.eventTitle}"`);
      rows = rows.filter((r) => r.title.toLowerCase().includes(filters.eventTitle!.toLowerCase()));
    }

    if (filters.eventType && filters.eventType !== 'Tümü') {
      appliedFiltersSummary.push(`Etkinlik Türü: ${filters.eventType}`);
      rows = rows.filter((r) => r.eventType === filters.eventType);
    }

    if (filters.eventStatus && filters.eventStatus !== 'Tümü') {
      appliedFiltersSummary.push(`Etkinlik Durumu: ${filters.eventStatus}`);
      rows = rows.filter((r) => r.status === filters.eventStatus);
    }

    if (filters.city && filters.city !== 'Tümü') {
      appliedFiltersSummary.push(`İl: ${filters.city}`);
      rows = rows.filter((r) => r.city === filters.city);
    }

    const evDistrict = filters.district || filters.eventDistrict;
    if (evDistrict && evDistrict !== 'Tümü') {
      appliedFiltersSummary.push(`İlçe: ${evDistrict}`);
      rows = rows.filter((r) => r.district === evDistrict);
    }

    // CRITICAL REQUIREMENT: Event date overlap logic
    // Checks if the event overlaps with [filterStartDate, filterEndDate]
    const fStart = filters.startDate || filters.eventStartDate;
    const fEnd = filters.endDate || filters.eventEndDate;
    if (fStart || fEnd) {
      const actualStart = fStart || '1970-01-01';
      const actualEnd = fEnd ? (fEnd.includes('T') ? fEnd : fEnd + 'T23:59:59') : '2099-12-31T23:59:59';
      appliedFiltersSummary.push(`Tarih Aralığı: ${formatDateTR(actualStart)} – ${formatDateTR(fEnd || '2099')}`);

      rows = rows.filter((r) => {
        const eStart = r.rawStart;
        const eEnd = r.rawEnd || r.rawStart;
        return eStart <= actualEnd && eEnd >= actualStart;
      });
    }

    if (filters.hasNoParticipants) {
      appliedFiltersSummary.push('Katılımcısı Olmayan Etkinlikler');
      rows = rows.filter((r) => r.participantCount === 0);
    }

    if (filters.minParticipants !== undefined && filters.minParticipants !== null && filters.minParticipants > 0) {
      appliedFiltersSummary.push(`Min Katılımcı: ${filters.minParticipants}`);
      rows = rows.filter((r) => r.participantCount >= filters.minParticipants!);
    }
    if (filters.maxParticipants !== undefined && filters.maxParticipants !== null) {
      appliedFiltersSummary.push(`Maks Katılımcı: ${filters.maxParticipants}`);
      rows = rows.filter((r) => r.participantCount <= filters.maxParticipants!);
    }

    if (filters.coordinatorId && String(filters.coordinatorId) !== 'Tümü') {
      const c = memberMap.get(Number(filters.coordinatorId));
      appliedFiltersSummary.push(`Sorumlu: ${c ? c.firstName + ' ' + c.lastName : '#' + filters.coordinatorId}`);
      rows = rows.filter((r) => r.coordinatorId === Number(filters.coordinatorId));
    }

    // Specific member participated in event
    const pMemberId = filters.participantMemberId || filters.memberId;
    if (pMemberId && String(pMemberId) !== 'Tümü') {
      const mId = Number(pMemberId);
      const m = memberMap.get(mId);
      appliedFiltersSummary.push(`Katılımcı Üye: ${m ? m.firstName + ' ' + m.lastName : '#' + mId}`);
      const memberEvents = new Set(
        rawParticipants.filter((p) => p.memberId === mId).map((p) => p.eventId)
      );
      rows = rows.filter((r) => memberEvents.has(r.id));
    }

    // Filter by participant role if given
    if (filters.participantRole && filters.participantRole !== 'Tümü') {
      appliedFiltersSummary.push(`Etkinlik Rolü: ${filters.participantRole}`);
      const matchingEvents = new Set(
        rawParticipants.filter((p) => p.role === filters.participantRole).map((p) => p.eventId)
      );
      rows = rows.filter((r) => matchingEvents.has(r.id));
    }

    // Sorting
    if (sortField) {
      rows.sort((a: any, b: any) => {
        const va = a[sortField];
        const vb = b[sortField];
        if (va === vb) return 0;
        const res = va > vb ? 1 : -1;
        return sortOrder === 'DESC' ? -res : res;
      });
    } else {
      // Default: start date DESC
      rows.sort((a, b) => b.rawStart.localeCompare(a.rawStart));
    }

    const totalCount = rows.length;

    // Distributions
    const distributionByEventType: Record<string, number> = {};
    const distributionByDistrict: Record<string, number> = {};
    rows.forEach((r) => {
      distributionByEventType[r.eventType] = (distributionByEventType[r.eventType] || 0) + 1;
      if (r.district) distributionByDistrict[r.district] = (distributionByDistrict[r.district] || 0) + 1;
    });

    const p = Math.max(1, page);
    const lim = limit > 0 ? limit : totalCount;
    const paginatedRows = limit > 0 ? rows.slice((p - 1) * lim, p * lim) : rows;

    return {
      rows: paginatedRows,
      totalCount,
      page: p,
      limit: lim,
      totalPages: limit > 0 ? Math.ceil(totalCount / lim) : 1,
      appliedFiltersSummary,
      summary: {
        totalRecords: totalCount,
        distributionByEventType,
        distributionByDistrict,
      },
    };
  }

  // -------------------------------------------------------------
  // DATA SOURCE 3: PARTICIPATIONS
  // -------------------------------------------------------------
  let rows = rawParticipants.map((p) => {
    const ev = eventMap.get(p.eventId);
    const mem = memberMap.get(p.memberId);

    return {
      id: p.id,
      eventId: p.eventId,
      memberId: p.memberId,
      eventTitle: ev?.title || `Etkinlik #${p.eventId}`,
      eventType: ev?.eventType || '-',
      eventStart: ev ? formatDateTR(ev.startDateTime, true) : '-',
      rawEventStart: ev?.startDateTime || '',
      eventDistrict: ev?.district || '-',
      memberFullName: mem ? `${mem.firstName} ${mem.lastName}` : `Üye #${p.memberId}`,
      memberNo: mem?.memberNo || '-',
      memberPosition: mem?.teamPosition || '-',
      memberPhone: mem ? formatPhoneTR(mem.phone) : '-',
      memberBranch: mem?.branch || '-',
      participantRole: p.role,
      attended: p.attended ? 'Katıldı' : 'Katılmadı',
      participantNotes: p.notes || '-',
    };
  });

  if (filters.search) {
    const q = filters.search.toLowerCase();
    appliedFiltersSummary.push(`Arama: "${filters.search}"`);
    rows = rows.filter(
      (r) =>
        r.memberFullName.toLowerCase().includes(q) ||
        r.eventTitle.toLowerCase().includes(q) ||
        r.memberNo.toLowerCase().includes(q) ||
        r.eventDistrict.toLowerCase().includes(q) ||
        r.memberBranch.toLowerCase().includes(q)
    );
  }

  if (filters.memberId && filters.memberId !== 'Tümü') {
    const mId = Number(filters.memberId);
    const m = memberMap.get(mId);
    appliedFiltersSummary.push(`Üye: ${m ? m.firstName + ' ' + m.lastName : '#' + mId}`);
    rows = rows.filter((r) => r.memberId === mId);
  }

  if (filters.eventId && filters.eventId !== 'Tümü') {
    const eId = Number(filters.eventId);
    const ev = eventMap.get(eId);
    appliedFiltersSummary.push(`Etkinlik: ${ev ? ev.title : '#' + eId}`);
    rows = rows.filter((r) => r.eventId === eId);
  }

  if (filters.attended && filters.attended !== 'Tümü') {
    appliedFiltersSummary.push(`Katılım Durumu: ${filters.attended}`);
    rows = rows.filter((r) => r.attended === filters.attended);
  }

  if (filters.eventType && filters.eventType !== 'Tümü') {
    appliedFiltersSummary.push(`Etkinlik Türü: ${filters.eventType}`);
    rows = rows.filter((r) => r.eventType === filters.eventType);
  }

  if (filters.participantRole && filters.participantRole !== 'Tümü') {
    appliedFiltersSummary.push(`Rol: ${filters.participantRole}`);
    rows = rows.filter((r) => r.participantRole === filters.participantRole);
  }

  const partDistrict = filters.district || filters.eventDistrict;
  if (partDistrict && partDistrict !== 'Tümü') {
    appliedFiltersSummary.push(`İlçe: ${partDistrict}`);
    rows = rows.filter((r) => r.eventDistrict === partDistrict);
  }

  if (filters.eventTitle) {
    appliedFiltersSummary.push(`Etkinlik: "${filters.eventTitle}"`);
    rows = rows.filter((r) => r.eventTitle.toLowerCase().includes(filters.eventTitle!.toLowerCase()));
  }

  if (filters.startDate) {
    appliedFiltersSummary.push(`Başlangıç: ${formatDateTR(filters.startDate)}`);
    rows = rows.filter((r) => r.rawEventStart && r.rawEventStart >= filters.startDate!);
  }

  if (filters.endDate) {
    appliedFiltersSummary.push(`Bitiş: ${formatDateTR(filters.endDate)}`);
    rows = rows.filter((r) => r.rawEventStart && r.rawEventStart <= (filters.endDate!.includes('T') ? filters.endDate! : filters.endDate! + 'T23:59:59'));
  }

  if (filters.firstName || filters.lastName) {
    const term = (filters.firstName || filters.lastName || '').toLowerCase();
    appliedFiltersSummary.push(`Üye Adı: "${term}"`);
    rows = rows.filter((r) => r.memberFullName.toLowerCase().includes(term));
  }

  if (sortField) {
    rows.sort((a: any, b: any) => {
      const va = a[sortField];
      const vb = b[sortField];
      if (va === vb) return 0;
      const res = va > vb ? 1 : -1;
      return sortOrder === 'DESC' ? -res : res;
    });
  } else {
    rows.sort((a, b) => b.rawEventStart.localeCompare(a.rawEventStart));
  }

  const totalCount = rows.length;
  const p = Math.max(1, page);
  const lim = limit > 0 ? limit : totalCount;
  const paginatedRows = limit > 0 ? rows.slice((p - 1) * lim, p * lim) : rows;

  return {
    rows: paginatedRows,
    totalCount,
    page: p,
    limit: lim,
    totalPages: limit > 0 ? Math.ceil(totalCount / lim) : 1,
    appliedFiltersSummary,
    summary: {
      totalRecords: totalCount,
    },
  };
}
