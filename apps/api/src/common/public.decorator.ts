import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/** Opts a route out of the global default-deny guard. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
