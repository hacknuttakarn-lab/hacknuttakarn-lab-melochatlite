import LiveNoticeCenter from "@/components/live-notice/LiveNoticeCenter";
import LiveNoticeComposerWeb, {
  type LiveNoticeObjectType,
} from "@/components/live-notice/LiveNoticeComposerWeb";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function objectTypeOf(value: string): LiveNoticeObjectType {
  if (value === "event" || value === "community") return value;
  return "trip";
}

export default async function LiveNoticePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[]; id?: string | string[] }>;
}) {
  const params = await searchParams;
  const objectId = first(params.id).trim();

  if (objectId) {
    return (
      <LiveNoticeComposerWeb
        objectType={objectTypeOf(first(params.type).trim())}
        objectId={objectId}
      />
    );
  }

  return <LiveNoticeCenter />;
}
