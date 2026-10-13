'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Eyebrow,
} from '@/components/design-system';
import { useStudio } from '@/lib/data';
import { DatasetExportMenu } from '../dataset-export-menu';
import { EnrichmentsSection } from './library-sections';
import { SectionTabs, useSectionTab } from './section-tabs';
import { PageHead, SelectField, Status, Toolbar } from './shared';

const typeTabs = [
  { value: 'all', label: 'All' },
  { value: 'dataset', label: 'Datasets' },
  { value: 'enrichment', label: 'Enrichments' },
];

const validationOptions = [
  { value: 'all', label: 'All validation states' },
  { value: 'Validated', label: 'Validated' },
  { value: 'Needs review', label: 'Needs review' },
  { value: 'Partial', label: 'Partial' },
];

export function DatasetsSection() {
  const datasets = useStudio((snapshot) => snapshot.auth.datasets);
  const searchParams = useSearchParams();
  const type = useSectionTab('type', typeTabs, 'all');
  const [query, setQuery] = useState('');
  const [validation, setValidation] = useState('all');
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const description = type === 'enrichment'
    ? 'CSV enrichment with a verdict and evidence per cell.'
    : 'Versioned structured outputs ready for review, export and delivery.';
  const visibleDatasets = datasets.filter((dataset) => (
    dataset.title.toLowerCase().includes(query.toLowerCase())
    && (validation === 'all' || dataset.status === validation)
  ));
  const selectedDataset = visibleDatasets.find((dataset) => dataset.id === selectedDatasetId)
    ?? visibleDatasets[0];

  return (
    <>
      <PageHead
        group="Operate"
        title="Datasets"
        description={description}
      />
      <SectionTabs
        value={type}
        tabs={typeTabs}
        param="type"
        fallback="all"
      />
      {type !== 'enrichment' ? (
        <>
          <Toolbar
            search="Search datasets"
            value={query}
            onChange={setQuery}
          >
            <SelectField
              label="Dataset validation"
              value={validation}
              onValueChange={setValidation}
              options={validationOptions}
              className="filter-select"
            />
            {selectedDataset ? (
              <>
                <SelectField
                  label="Dataset to export"
                  value={selectedDataset.id}
                  onValueChange={setSelectedDatasetId}
                  options={visibleDatasets.map((dataset) => ({
                    value: dataset.id,
                    label: dataset.title,
                  }))}
                  className="filter-select"
                />
                <DatasetExportMenu dataset={selectedDataset} />
              </>
            ) : null}
          </Toolbar>
          <section className="dataset-cards">
            {visibleDatasets.map((dataset) => (
              <Card className="dataset-card" role="article" key={dataset.id}>
                <CardHeader>
                  <div>
                    <Eyebrow>{dataset.version.replace('DATASET · ', 'Dataset ')}</Eyebrow>
                    <h2>{dataset.title}</h2>
                  </div>
                </CardHeader>
                <CardContent>
                  <p>{dataset.detail}</p>
                </CardContent>
                <CardFooter>
                  {dataset.review?.status === 'Open' ? (
                    <Link href="/review">
                      <Status tone="warning">Needs review</Status>
                    </Link>
                  ) : (
                    <Status tone={dataset.tone}>{dataset.status}</Status>
                  )}
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={`/datasets/${dataset.id}`}>Open</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </section>
        </>
      ) : null}
      {type !== 'dataset' ? (
        <EnrichmentsSection
          showHeader={false}
          openCreateOnMount={searchParams.get('create') === 'csv'}
        />
      ) : null}
    </>
  );
}
