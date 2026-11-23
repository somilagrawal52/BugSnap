import 'server-only';
import {createAppAuth} from '@octokit/auth-app';
import {Octokit} from '@octokit/rest';
import {adminClient} from './supabase/server';
import {required} from './env';
export function installationClient(installationId:number) {return new Octokit({authStrategy:createAppAuth,auth:{appId:required('GITHUB_APP_ID'),privateKey:required('GITHUB_PRIVATE_KEY').replaceAll('\\n','\n'),installationId},request:{timeout:20000}});}
export async function refreshRepositories(installation:{id:string;organization_id:string;installation_id:number}) {
 const github=installationClient(installation.installation_id);const repositories=await github.paginate(github.apps.listReposAccessibleToInstallation,{per_page:100});
 const db=adminClient();const disable=await db.from('github_repositories').update({enabled:false}).eq('installation_id',installation.id);if(disable.error)throw disable.error;
 for(const repository of repositories){const result=await db.from('github_repositories').upsert({organization_id:installation.organization_id,installation_id:installation.id,github_id:repository.id,full_name:repository.full_name,enabled:true},{onConflict:'installation_id,github_id'});if(result.error)throw result.error;}
}
