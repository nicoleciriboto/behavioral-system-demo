import '../styles/components/Confetti.css'

export default function Confetti({ particles }) {
  return (
    <div className="confetti-container">
      {particles.map((p, i) => (
        <div
          key={i}
          className="confetti-particle"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.radius,
            animation: `chaiFall ${p.duration} linear ${p.delay} forwards`
          }}
        />
      ))}
    </div>
  )
}
