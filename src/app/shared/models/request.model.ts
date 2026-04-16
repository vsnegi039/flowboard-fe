export interface apiResponse<T> {
    status: boolean,
    message: string,
    data: T | null
}