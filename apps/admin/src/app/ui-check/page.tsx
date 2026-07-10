import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@tourism/ui';

export const metadata = { title: '@tourism/ui smoke check' };

export default function UiCheckPage() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">@tourism/ui</h1>
        <Badge>Base UI</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Smoke check</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button>Primary</Button>
          <Button variant="outline">Outline</Button>
        </CardContent>
      </Card>
    </main>
  );
}
