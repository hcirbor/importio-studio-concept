# Import.io Studio Next

A parallel rebuild of the Studio concept using Next.js App Router, React 19, TypeScript 6, Tailwind 4 and the local `@importio/design-system` package.

The original static prototype remains unchanged in the parent directory. This project uses the design system as the visual source of truth and keeps ShadCN-compatible project metadata for future component additions.

## Run

```sh
npm install
npm run dev
```

Open `http://localhost:3000`.

## Design-system dependency

The package currently resolves from the adjacent project at `../../Import.io design system`. Once `@importio/design-system` is published to npm, replace the `file:` dependency in `package.json` with the published version.
