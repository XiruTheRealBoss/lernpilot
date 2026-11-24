import type { NormalizedAnnouncement } from '../../types';

interface AnnouncementsListProps {
  announcements: NormalizedAnnouncement[];
}

/** Formata a data de criação de um anúncio em pt-BR (ex: "12/06/2026"). */
function formatAnnouncementDate(date: Date | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

/** Lista de anúncios das professoras nas últimas 2 semanas, destacando avisos importantes. */
export function AnnouncementsList({ announcements }: AnnouncementsListProps) {
  if (announcements.length === 0) return null;

  const sorted = [...announcements].sort((a, b) => {
    const timeA = a.creationTime?.getTime() ?? 0;
    const timeB = b.creationTime?.getTime() ?? 0;
    return timeB - timeA;
  });

  return (
    <section className="mt-8">
      <h2 className="font-bold text-texto mb-3">Avisos</h2>
      <div className="space-y-3">
        {sorted.map((announcement) => (
          <div
            key={announcement.id}
            className="bg-card rounded-card shadow-card p-4"
          >
            <div className="flex items-center justify-between gap-2 text-xs text-texto-suave mb-1">
              <span>{announcement.courseName}, {announcement.teacherName}</span>
              <span className="tabular-nums">{formatAnnouncementDate(announcement.creationTime)}</span>
            </div>
            <p className="text-sm text-texto leading-relaxed">
              {announcement.text}
            </p>
            <a
              href={announcement.alternateLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold text-primaria hover:underline mt-2 inline-block"
            >
              Ver no Classroom
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
