import { unlink } from 'fs/promises';

export const removeFile = async (path: string) => {
    try {
        await unlink(path);
    } catch (e) {
        console.error('Error removing file');
        throw e;
    }
};
