interface Props { steps: string[]; current: number }

export function FlowGuide({ steps, current }: Props) {
  return <ol className="flow-guide" aria-label="ขั้นตอนการทำรายการ">{steps.map((step, index) => <li key={step} aria-current={index === current ? 'step' : undefined}><span aria-hidden="true">{index + 1}</span>{step}</li>)}</ol>
}
