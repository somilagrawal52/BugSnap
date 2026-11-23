'use client';
import Link from 'next/link';
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@bugsnap/ui';
import { label, type Report } from '@bugsnap/shared';
import { MessageSquare, Inbox } from 'lucide-react';
type Row = Report & { projects?: { name: string } | null; assignee?:{display_name:string}|null };
const columns: ColumnDef<Row>[] = [
  {
    accessorKey: 'reference',
    header: 'Report',
    cell: ({ row }) => <span className="report-reference">{row.original.reference}</span>,
  },
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => (
      <Link className="report-title" href={`/dashboard/reports/${row.original.id}`}>
        <span className="report-row-icon">
          <MessageSquare size={15} />
        </span>
        {row.original.title}
      </Link>
    ),
  },
  {
    id: 'project',
    header: 'Project',
    cell: ({ row }) => <span className="table-project">{row.original.projects?.name || '—'}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge className={`status-${row.original.status}`}>
        <span className="status-dot" />
        {label(row.original.status)}
      </Badge>
    ),
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }) => (
      <span className={`priority priority-${row.original.priority}`}>
        <span className="priority-bars">▥</span>
        {label(row.original.priority)}
      </span>
    ),
  },
  {
    accessorKey: 'assignee_id',
    header: 'Assignee',
    cell: ({ row }) => (
      <span className="table-project">{row.original.assignee_id ? row.original.assignee?.display_name||'Teammate' : 'Unassigned'}</span>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Submitted',
    cell: ({ getValue }) => (
      <time className="table-date" dateTime={String(getValue())}>
        {new Date(String(getValue())).toLocaleDateString('en', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        })}
      </time>
    ),
  },
];
export function ReportsTable({ reports }: { reports: Row[] }) {
  const table = useReactTable({ data: reports, columns, getCoreRowModel: getCoreRowModel() });
  if (!reports.length)
    return (
      <div className="empty-state">
        <Inbox size={30} />
        <h3>Your next fix starts here.</h3>
        <p>No reports match this view. Install your widget or adjust the filters.</p>
        <Link className="button button-outline" href="/dashboard/projects">
          View projects
        </Link>
      </div>
    );
  return (
    <div className="table-scroll">
      <table>
        <thead>
          {table.getHeaderGroups().map((g) => (
            <tr key={g.id}>
              {g.headers.map((h) => (
                <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((c) => (
                <td key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
