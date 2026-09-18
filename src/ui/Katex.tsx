import { useMemo } from 'react';
import katex from 'katex';
import type { Mat2 } from '../math/types';
import { matrixTex } from './tex';

/** Renders a TeX string. The input is trusted: every string is built in-app. */
export function Tex({ children, display = false }: { children: string; display?: boolean }) {
  const html = useMemo(
    () =>
      katex.renderToString(children, {
        displayMode: display,
        throwOnError: false,
        output: 'html',
      }),
    [children, display],
  );
  return <span className="tex" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function MatrixTex({ m, digits = 2 }: { m: Mat2; digits?: number }) {
  return <Tex>{matrixTex(m, digits)}</Tex>;
}
