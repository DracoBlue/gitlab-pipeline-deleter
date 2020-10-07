import React from 'react';
import { assert } from 'chai';
import { render } from 'ink-testing-library';
import { parseISO } from 'date-fns';
import delay from 'delay';
import { withGitLabServer } from './gitlabServer';
import { Main } from '../../src/Main';
import { deletePipeline, filterPipelinesByDate, listPipelines } from '../../src/gitlab';
import { getRequest, deleteRequest } from '../../src/network';

async function waitUntilDeleted(frames: string[]) {
  if (frames.some((frame) => frame.includes('Pipelines deleted'))) {
    return;
  }
  if (frames.some((frame) => frame.includes('error'))) {
    return;
  }
  await delay(10);
  await waitUntilDeleted(frames);
}

function renderMain(gitlabUrl: string) {
  const projectId = 42;
  const days = 30;
  const accessToken = 'yBv8';
  const startDate = parseISO('2020-10-01T09:08:52.710Z');
  const listPipelinesFunction = listPipelines({ getRequest, gitlabUrl, projectId, accessToken });
  const deletePipelineFunction = deletePipeline({
    deleteRequest,
    gitlabUrl,
    projectId,
    accessToken,
  });
  return render(
    <Main
      gitlabUrl={gitlabUrl}
      projectId={projectId}
      accessToken={accessToken}
      days={days}
      startDate={startDate}
      exit={() => (process.exitCode = 1)}
      listPipelines={listPipelinesFunction}
      filterPipelinesByDate={filterPipelinesByDate}
      deletePipeline={deletePipelineFunction}
      showStackTraces={false}
    />,
  );
}

suite('delete pipelines', function () {
  test(
    'deletes 4 old pipelines that are older than 30 days',
    withGitLabServer({}, async (url) => {
      const { lastFrame, frames } = renderMain(url);
      await waitUntilDeleted(frames);
      const actual = lastFrame();
      const expected =
        'Deleting pipeline with id 32\nDeleting pipeline with id 33\nDeleting pipeline with id 34\nDeleting pipeline with id 35\n\u001b[32mPipelines deleted\u001b[39m';
      assert.equal(actual, expected);
    }),
  );

  test(
    'fails with the response error message when a gitlab delete request fails',
    withGitLabServer({ failOnDelete: true }, async (url) => {
      const { lastFrame, frames } = renderMain(url);
      await waitUntilDeleted(frames);
      const actual = lastFrame();
      const expected =
        "Deleting pipeline with id 36\nDeleting pipeline with id 37\nDeleting pipeline with id 38\nDeleting pipeline with id 39\nDeleting pipeline with id 40\nDeleting pipeline with id 41\nDeleting pipeline with id 42\nDeleting pipeline with id 43\nDeleting pipeline with id 44\nDeleting pipeline with id 45\n\u001b[31mThere was an error while deleting the pipelines: Response code 418 (I'm a Teapot)\u001b[39m";
      assert.equal(actual, expected);
    }),
  );
});
