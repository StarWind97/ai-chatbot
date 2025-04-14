'use client';

import { useChat } from '@ai-sdk/react';
import { useEffect, useRef } from 'react';
// import { artifactDefinitions, type ArtifactKind } from './artifact';
// import type { Suggestion } from '@/lib/db/schema';
// import { initialArtifactData, useArtifact } from '@/hooks/use-artifact';

// 定义我们自己的文档类型
// type DocumentKind = 'text' | 'code' | 'sheet';

// 定义文档状态接口
// interface DocumentState {
//   documentId: string;
//   kind: DocumentKind;
//   title: string;
//   content: string;
//   status: 'idle' | 'streaming';
//   isVisible: boolean;
//   boundingBox: {
//     top: number;
//     left: number;
//     width: number;
//     height: number;
//   };
// }

// 初始文档数据在DocumentContext中已经定义
// const initialDocumentData: DocumentState = {
//   documentId: '',
//   kind: 'text',
//   title: '',
//   content: '',
//   status: 'idle',
//   isVisible: false,
//   boundingBox: {
//     top: 0,
//     left: 0,
//     width: 0,
//     height: 0,
//   },
// };

// 简化数据流类型
export type DataStreamDelta = {
  type: 'text-delta' | string;
  content: string | any;
};

export function DataStreamHandler({ id }: { id: string }) {
  const { data: dataStream } = useChat({ id });
  // 移除文档状态管理
  // const { documentState, setDocumentState } = useDocument();
  const lastProcessedIndex = useRef(-1);

  useEffect(() => {
    if (!dataStream?.length) return;

    const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
    lastProcessedIndex.current = dataStream.length - 1;

    // Development logging only
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        '[DataStreamHandler] Processing new deltas:',
        newDeltas.length,
      );
    }
  }, [dataStream]);

  return null;
}
