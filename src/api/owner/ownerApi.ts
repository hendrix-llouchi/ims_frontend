import axiosInstance from '../axios';
import type { Paginated } from '../../types/workerApi';
import type {
  OwnerUser,
  OwnerUserCreateInput,
  OwnerUserUpdateInput,
} from '../../types/ownerApi';

export interface FetchUsersParams {
  page?: number;
  search?: string;
  role?: 'manager' | 'worker' | '';
  is_active?: boolean | '';
}

/** GET /api/owner/users — paginated list of managers and workers */
export async function fetchOwnerUsers(
  params: FetchUsersParams = {}
): Promise<Paginated<OwnerUser>> {
  const queryParams: Record<string, string | number> = {};
  if (params.page) queryParams.page = params.page;
  if (params.search) queryParams.search = params.search;
  if (params.role) queryParams.role = params.role;
  
  if (params.is_active === true) {
    queryParams.is_active = 1;
  } else if (params.is_active === false) {
    queryParams.is_active = 0;
  }

  const res = await axiosInstance.get<Paginated<OwnerUser>>('/api/owner/users', {
    params: queryParams,
  });
  return res.data;
}

/** POST /api/owner/users/create — create a new user account */
export async function createOwnerUser(
  data: OwnerUserCreateInput
): Promise<{ message: string; user: OwnerUser; temporary_password?: string }> {
  const res = await axiosInstance.post<{
    message: string;
    user: OwnerUser;
    temporary_password?: string;
  }>('/api/owner/users/create', data);
  return res.data;
}

/** GET /api/owner/users/{id} — view single user details */
export async function fetchOwnerUserDetails(
  id: number
): Promise<{ user: OwnerUser }> {
  const res = await axiosInstance.get<{ user: OwnerUser }>(
    `/api/owner/users/${id}`
  );
  return res.data;
}

/** PUT /api/owner/users/{id} — update user profile fields */
export async function updateOwnerUser(
  id: number,
  data: OwnerUserUpdateInput
): Promise<{ message: string; user: OwnerUser }> {
  const res = await axiosInstance.put<{ message: string; user: OwnerUser }>(
    `/api/owner/users/${id}`,
    data
  );
  return res.data;
}

/** PUT /api/owner/users/{id}/deactivate — deactivate user */
export async function deactivateOwnerUser(
  id: number
): Promise<{ message: string }> {
  const res = await axiosInstance.put<{ message: string }>(
    `/api/owner/users/${id}/deactivate`
  );
  return res.data;
}

/** PUT /api/owner/users/{id}/reactivate — reactivate user */
export async function reactivateOwnerUser(
  id: number
): Promise<{ message: string }> {
  const res = await axiosInstance.put<{ message: string }>(
    `/api/owner/users/${id}/reactivate`
  );
  return res.data;
}

/** PATCH /api/owner/users/{id}/reset-password — reset user password */
export async function resetOwnerUserPassword(
  id: number
): Promise<{ message: string; temporary_password: string }> {
  const res = await axiosInstance.patch<{
    message: string;
    temporary_password: string;
  }>(`/api/owner/users/${id}/reset-password`);
  return res.data;
}

/** DELETE /api/owner/users/{id} — permanently delete user */
export async function deleteOwnerUser(
  id: number
): Promise<{ message: string }> {
  const res = await axiosInstance.delete<{ message: string }>(
    `/api/owner/users/${id}`
  );
  return res.data;
}
