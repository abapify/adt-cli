import { getJestProjectsAsync } from '@nx/jest';

export default async function jestConfig() {
  return { projects: await getJestProjectsAsync() };
}
