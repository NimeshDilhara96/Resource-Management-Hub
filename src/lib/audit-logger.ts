export type SecurityAuditEvent =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_LOGOUT'
  | 'AUTH_RATE_LIMITED'
  | 'USER_REGISTERED'
  | 'RESOURCE_CREATED'
  | 'RESOURCE_UPDATED'
  | 'RESOURCE_STATUS_TOGGLED'
  | 'RESERVATION_CREATED'
  | 'RESERVATION_CANCELLED'
  | 'RESERVATION_STATUS_UPDATED'
  | 'SECURITY_ACCESS_DENIED'
  | 'OBJECT_AUTH_VIOLATION';

export interface AuditLogEntry {
  timestamp: string;
  event: SecurityAuditEvent;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  targetId?: string;
  targetType?: string;
  details?: Record<string, any>;
  ip?: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
}

/**
 * Standardized Security Audit Logger
 * Emits structured JSON audit trails for sensitive operations and authorization events.
 */
export function logSecurityAudit(entry: Omit<AuditLogEntry, 'timestamp'>): void {
  const logRecord: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    ...entry,
  };

  const formatted = `[SECURITY_AUDIT] [${logRecord.severity}] ${logRecord.event} | Actor: ${logRecord.actorEmail || logRecord.actorId || 'Anonymous'} | Target: ${logRecord.targetType || 'N/A'}:${logRecord.targetId || 'N/A'} | Details: ${JSON.stringify(logRecord.details || {})}`;

  if (entry.severity === 'CRITICAL') {
    console.error(formatted);
  } else if (entry.severity === 'WARN') {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}
