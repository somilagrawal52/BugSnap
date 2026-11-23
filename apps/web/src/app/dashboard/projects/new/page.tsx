import {workspace} from '@/lib/workspace';
import {PageHeading} from '@/components/page-heading';
import {ProjectForm} from '@/components/project-form';
export default async function NewProject(){const {role}=await workspace();return <><PageHeading title="Create a project" description="One small snippet. A much clearer picture of every bug."/><section className="panel settings-panel">{role==='member'?<p>An owner or admin can create projects.</p>:<ProjectForm/>}</section></>;}
