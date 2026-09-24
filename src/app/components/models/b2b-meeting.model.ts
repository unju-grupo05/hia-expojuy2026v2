export interface B2BMeetingRequest {
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientPhone: string;
  exhibitorId: string;
  exhibitorName: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  attendees: number;
  description: string;
  modality: 'presencial' | 'virtual';
  notes: string;
}
