'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/session';
import { formatErrorMessage } from '@/lib/utils';
import { ResourceService } from '@/services/resource.service';
import {
  createResourceSchema,
  updateResourceSchema,
  CreateResourceInput,
  UpdateResourceInput,
} from '@/schemas/resource.schema';
import { assertPermission } from '@/lib/permissions';
import { logSecurityAudit } from '@/lib/audit-logger';

/**
 * Creates a shared company resource (Admin privilege only).
 * Audits creation event and asserts 'resource:create' permission.
 */
export async function createResourceAction(data: CreateResourceInput) {
  try {
    const session = await requireAdmin();
    assertPermission(session, 'resource:create');

    const validated = createResourceSchema.parse(data);
    const newResource = await ResourceService.createResource(validated);

    logSecurityAudit({
      event: 'RESOURCE_CREATED',
      actorId: session.id,
      actorEmail: session.email,
      actorRole: session.role,
      targetId: newResource.id,
      targetType: 'Resource',
      details: { name: validated.name, type: validated.type },
      severity: 'INFO',
    });

    revalidatePath('/dashboard');
    revalidatePath('/admin');
    revalidatePath('/admin/resources');

    return {
      success: true,
      resource: newResource,
      message: 'Resource created successfully!',
    };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      return {
        success: false,
        error: firstIssue?.message || 'Invalid resource data provided.',
      };
    }
    return {
      success: false,
      error: formatErrorMessage(error),
    };
  }
}

/**
 * Updates a shared resource with strict administrative authorization and audit log.
 */
export async function updateResourceAction(
  id: string,
  data: UpdateResourceInput
) {
  try {
    const session = await requireAdmin();
    assertPermission(session, 'resource:update');

    const validated = updateResourceSchema.parse(data);
    const updated = await ResourceService.updateResource(id, validated);

    logSecurityAudit({
      event: 'RESOURCE_UPDATED',
      actorId: session.id,
      actorEmail: session.email,
      actorRole: session.role,
      targetId: id,
      targetType: 'Resource',
      details: { updatedFields: Object.keys(validated) },
      severity: 'INFO',
    });

    revalidatePath('/dashboard');
    revalidatePath('/admin');
    revalidatePath('/admin/resources');

    return {
      success: true,
      resource: updated,
      message: 'Resource updated successfully!',
    };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      return {
        success: false,
        error: firstIssue?.message || 'Invalid resource update data provided.',
      };
    }
    return {
      success: false,
      error: formatErrorMessage(error),
    };
  }
}

/**
 * Toggles a resource status between ACTIVE and INACTIVE (maintenance / decommissioning).
 */
export async function toggleResourceStatusAction(id: string) {
  try {
    const session = await requireAdmin();
    assertPermission(session, 'resource:toggle_status');

    const updated = await ResourceService.toggleStatus(id);

    logSecurityAudit({
      event: 'RESOURCE_STATUS_TOGGLED',
      actorId: session.id,
      actorEmail: session.email,
      actorRole: session.role,
      targetId: id,
      targetType: 'Resource',
      details: { newStatus: updated.status },
      severity: 'INFO',
    });

    revalidatePath('/dashboard');
    revalidatePath('/admin');
    revalidatePath('/admin/resources');

    return {
      success: true,
      resource: updated,
      message: `Resource is now ${updated.status}.`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: formatErrorMessage(error),
    };
  }
}
