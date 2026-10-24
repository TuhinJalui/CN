import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Move3d, Rotate3d, ScanLine, X, ZoomIn } from 'lucide-react'
import type { SimulationController } from '../hooks/useSimulation'

interface ThreeLabProps {
  open: boolean
  sim: SimulationController
  onClose: () => void
}

interface SceneRuntime {
  active: boolean
  paused: boolean
  jammed: boolean
  jamStrength: number
  bit: number | null
  phase: string
}

export function ThreeLab({ open, sim, onClose }: ThreeLabProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const txLabelRef = useRef<HTMLDivElement | null>(null)
  const rxLabelRef = useRef<HTMLDivElement | null>(null)
  const stateRef = useRef<SceneRuntime>({
    active: false,
    paused: false,
    jammed: false,
    jamStrength: 0,
    bit: 1,
    phase: 'idle',
  })

  stateRef.current = {
    active: sim.phase === 'channel' || sim.phase === 'modulating',
    paused: sim.paused,
    jammed: sim.config.jammer,
    jamStrength: sim.config.jamStrength,
    bit: sim.activeTxBit ?? 1,
    phase: sim.phase,
  }

  useEffect(() => {
    if (!open) return undefined
    const mount = mountRef.current
    if (!mount) return undefined

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#03070b')
    scene.fog = new THREE.FogExp2('#03070b', 0.026)

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    camera.position.set(5.7, 3.05, 7.2)

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(1.8, window.devicePixelRatio || 1))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.32
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 1.42, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.minDistance = 5.5
    controls.maxDistance = 26
    controls.maxPolarAngle = Math.PI * 0.48
    controls.minPolarAngle = Math.PI * 0.16
    controls.autoRotate = false

    const fitTarget = new THREE.Vector3(0, 1.42, 0)
    const fitDirection = new THREE.Vector3(5.7, 1.63, 7.2).normalize()
    let userMoved = false
    controls.addEventListener('start', () => {
      userMoved = true
    })

    scene.add(new THREE.HemisphereLight(0x8fd3e8, 0x0a1822, 1.5))
    scene.add(new THREE.AmbientLight(0x6aa4b8, 1.35))
    const key = new THREE.DirectionalLight(0xd4f8ff, 4.2)
    key.position.set(-5, 9, 6)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0x7ea8ff, 1.6)
    fill.position.set(2, 3.5, -8)
    scene.add(fill)
    const rim = new THREE.PointLight(0x7c6aff, 9, 14, 2)
    rim.position.set(4, 2.5, -2)
    scene.add(rim)
    const txLight = new THREE.PointLight(0x56e6ff, 5, 7, 2)
    txLight.position.set(-3.2, 2.2, 1.5)
    scene.add(txLight)
    const rxLight = new THREE.PointLight(0x927cff, 4.5, 7, 2)
    rxLight.position.set(3.2, 2.2, 1.5)
    scene.add(rxLight)

    // Floor.
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#0b2130',
      metalness: 0.55,
      roughness: 0.46,
      transparent: true,
      opacity: 0.94,
    })
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 16), floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.03
    scene.add(floor)
    const grid = new THREE.GridHelper(24, 32, '#2ea6bf', '#113542')
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material]
    for (const material of gridMaterials) {
      material.transparent = true
      material.opacity = 0.7
    }
    grid.position.y = 0.01
    scene.add(grid)

    // Star / dust field.
    const dustGeometry = new THREE.BufferGeometry()
    const dustPositions = new Float32Array(900 * 3)
    for (let i = 0; i < 900; i += 1) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 30
      dustPositions[i * 3 + 1] = Math.random() * 9 + 0.2
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 18 - 2
    }
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
    const dustMaterial = new THREE.PointsMaterial({
      color: '#589bb5',
      size: 0.028,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
    })
    const dust = new THREE.Points(dustGeometry, dustMaterial)
    scene.add(dust)

    const interactive: Array<THREE.Object3D> = []

    const createNode = (x: number, accent: string, isTransmitter: boolean) => {
      const group = new THREE.Group()
      group.position.set(x, 0, 0)
      scene.add(group)
      interactive.push(group)

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(1.14, 1.22, 0.2, 32),
        new THREE.MeshStandardMaterial({
          color: '#1a3f50',
          metalness: 0.68,
          roughness: 0.3,
        }),
      )
      base.position.y = 0.1
      group.add(base)

      const baseRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.02, 0.018, 8, 64),
        new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.5 }),
      )
      baseRing.rotation.x = Math.PI / 2
      baseRing.position.y = 0.23
      group.add(baseRing)

      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(1.55, 1.58, 1.22),
        new THREE.MeshStandardMaterial({
          color: '#173746',
          metalness: 0.6,
          roughness: 0.34,
          emissive: new THREE.Color('#07202b'),
          emissiveIntensity: 0.7,
        }),
      )
      tower.position.y = 1.1
      group.add(tower)

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(tower.geometry),
        new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.72 }),
      )
      edges.position.copy(tower.position)
      group.add(edges)

      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(1.12, 0.65),
        new THREE.MeshBasicMaterial({
          color: '#082734',
          transparent: true,
          opacity: 1,
          side: THREE.DoubleSide,
        }),
      )
      screen.position.set(0, 1.35, 0.615)
      group.add(screen)

      const screenEdge = new THREE.LineSegments(
        new THREE.EdgesGeometry(screen.geometry),
        new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.9 }),
      )
      screenEdge.position.copy(screen.position)
      group.add(screenEdge)

      for (let row = 0; row < 4; row += 1) {
        const line = new THREE.Mesh(
          new THREE.PlaneGeometry(0.72 - row * 0.12, 0.018),
          new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.62 }),
        )
        line.position.set(-0.14, 1.52 - row * 0.1, 0.621)
        group.add(line)
      }

      const transducer = new THREE.Mesh(
        isTransmitter
          ? new THREE.CylinderGeometry(0.2, 0.3, 0.22, 24)
          : new THREE.ConeGeometry(0.27, 0.35, 24, 1, true),
        new THREE.MeshStandardMaterial({
          color: '#1b3a48',
          metalness: 0.68,
          roughness: 0.3,
          emissive: new THREE.Color(accent),
          emissiveIntensity: 0.55,
        }),
      )
      transducer.rotation.z = Math.PI / 2
      transducer.position.set(isTransmitter ? 0.88 : -0.88, 1.1, 0)
      group.add(transducer)

      const legLeft = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.48, 0.7),
        new THREE.MeshStandardMaterial({ color: '#11232e', metalness: 0.55, roughness: 0.42 }),
      )
      legLeft.position.set(-0.55, 0.36, 0)
      group.add(legLeft)
      const legRight = legLeft.clone()
      legRight.position.x = 0.55
      group.add(legRight)

      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 14, 14),
        new THREE.MeshBasicMaterial({ color: accent }),
      )
      beacon.position.set(0.55, 1.88, 0.45)
      group.add(beacon)
      const beaconLight = new THREE.PointLight(accent, 0.6, 1.3, 2)
      beaconLight.position.copy(beacon.position)
      group.add(beaconLight)

      return { group, accent, screen, beacon, baseRing }
    }

    const tx = createNode(-3.15, '#62e7ff', true)
    const rx = createNode(3.15, '#9b87ff', false)

    // Data beam: a subtle wave between transducers.
    const beamPoints = 160
    const beamGeometry = new THREE.BufferGeometry()
    const beamPositions = new Float32Array(beamPoints * 3)
    beamGeometry.setAttribute('position', new THREE.BufferAttribute(beamPositions, 3))
    const beamMaterial = new THREE.LineBasicMaterial({
      color: '#72ebff',
      transparent: true,
      opacity: 0.55,
    })
    const beam = new THREE.Line(beamGeometry, beamMaterial)
    scene.add(beam)

    // Acoustic wavefronts.
    const waveRings: Array<{ mesh: THREE.Mesh; phase: number; isJam: boolean }> = []
    for (let i = 0; i < 14; i += 1) {
      const geometry = new THREE.TorusGeometry(1, 0.017, 7, 64)
      const material = new THREE.MeshBasicMaterial({
        color: i % 5 === 0 ? '#907cff' : '#64e7ff',
        transparent: true,
        opacity: 0.12,
      })
      const ring = new THREE.Mesh(geometry, material)
      ring.rotation.y = Math.PI / 2
      ring.position.set(-3.1, 1.5, 0)
      scene.add(ring)
      waveRings.push({ mesh: ring, phase: i / 14, isJam: false })
    }

    // Acoustic particles.
    const particleCount = 360
    const particleGeometry = new THREE.BufferGeometry()
    const particlePositions = new Float32Array(particleCount * 3)
    const particleColors = new Float32Array(particleCount * 3)
    const particleData: Array<{ speed: number; y: number; z: number; reset: number }> = []
    for (let i = 0; i < particleCount; i += 1) {
      particlePositions[i * 3] = -3.1 + Math.random() * 6.2
      particlePositions[i * 3 + 1] = 1.5 + (Math.random() - 0.5) * 1.04
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 1.1
      particleColors[i * 3] = 0.34
      particleColors[i * 3 + 1] = 0.9
      particleColors[i * 3 + 2] = 1
      particleData.push({
        speed: 0.24 + Math.random() * 0.58,
        y: 1.5 + (Math.random() - 0.5) * 1.04,
        z: (Math.random() - 0.5) * 1.1,
        reset: Math.random(),
      })
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3))
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const particles = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particles)

    // Floating geometric accents.
    const orbitalRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.3, 0.006, 6, 120),
      new THREE.MeshBasicMaterial({ color: '#417787', transparent: true, opacity: 0.2 }),
    )
    orbitalRing.rotation.x = Math.PI / 2.6
    orbitalRing.position.y = 2.3
    scene.add(orbitalRing)
    const orbitalRing2 = orbitalRing.clone()
    orbitalRing2.rotation.x = Math.PI / 2.9
    orbitalRing2.rotation.z = 0.8
    orbitalRing2.scale.setScalar(0.78)
    scene.add(orbitalRing2)

    let frame = 0
    let elapsed = 0
    let last = performance.now()
    let stageWidth = 1
    let stageHeight = 1
    const projected = new THREE.Vector3()

    const placeLabel = (element: HTMLDivElement | null, x: number, y: number, z: number) => {
      if (!element) return
      projected.set(x, y, z).project(camera)
      const visible = projected.z < 1 && projected.z > -1
      const px = (projected.x * 0.5 + 0.5) * stageWidth
      const py = (-projected.y * 0.5 + 0.5) * stageHeight
      element.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -100%)`
      element.style.opacity = visible ? '1' : '0'
    }
    const resize = () => {
      // clientWidth/clientHeight give the final layout box even while the
      // modal's open animation is still scaling the element; getBoundingClientRect
      // would return the mid-animation size and leave the canvas undersized.
      const width = Math.max(320, mount.clientWidth)
      const height = Math.max(320, mount.clientHeight)
      renderer.setSize(width, height, false)
      stageWidth = width
      stageHeight = height
      const aspect = width / height
      camera.aspect = aspect
      camera.fov = aspect < 0.8 ? 44 : 38
      if (!userMoved) {
        const distance = Math.min(24, (9.2 * 1.55) / Math.min(aspect, 1.55))
        camera.position.copy(fitTarget).addScaledVector(fitDirection, distance)
      }
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(mount)
    resize()

    const render = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000)
      last = now
      const state = stateRef.current
      if (!state.paused) elapsed += dt
      const time = elapsed

      controls.update()
      const active = state.active
      tx.baseRing.material.opacity = active ? 0.62 + Math.sin(time * 6) * 0.18 : 0.25
      rx.baseRing.material.opacity = active ? 0.58 + Math.sin(time * 5.4 + 1) * 0.16 : 0.25
      tx.beacon.material.color.set(state.jammed ? '#ff7580' : '#62e7ff')
      rx.beacon.material.color.set(state.jammed ? '#ff9f72' : '#9b87ff')
      const pulse = 1 + Math.sin(time * 5) * 0.08
      tx.beacon.scale.setScalar(active ? pulse : 0.8)
      rx.beacon.scale.setScalar(active ? pulse : 0.8)
      ;(tx.screen.material as THREE.MeshBasicMaterial).color.set(
        active ? (state.bit === 1 ? '#0c3b46' : '#1d1c4c') : '#082734',
      )

      // Wavefronts.
      for (const item of waveRings) {
        const phase = ((time * (active ? 0.15 : 0.04) + item.phase) % 1 + 1) % 1
        const radius = 0.26 + phase * 1.42
        item.mesh.position.x = -3.05 + phase * 6.0
        item.mesh.scale.setScalar(radius)
        const material = item.mesh.material as THREE.MeshBasicMaterial
        material.opacity = active
          ? Math.sin(phase * Math.PI) * (state.jammed && item.phase > 0.65 ? 0.3 : 0.15)
          : 0.016
        material.color.set(
          state.jammed && item.phase > 0.55 ? '#ff7785' : item.phase > 0.5 ? '#8a7aff' : '#64e7ff',
        )
      }

      // Particles.
      const positions = particleGeometry.attributes.position.array as Float32Array
      const colors = particleGeometry.attributes.color.array as Float32Array
      for (let i = 0; i < particleCount; i += 1) {
        if (active && !state.paused) {
          positions[i * 3] += particleData[i].speed * dt
          if (positions[i * 3] > 3.1) {
            positions[i * 3] = -3.1
            particleData[i].y = 1.5 + (Math.random() - 0.5) * 1.04
            particleData[i].z = (Math.random() - 0.5) * 1.1
          }
        }
        positions[i * 3 + 1] = particleData[i].y + Math.sin(time * 2.4 + i) * (active ? 0.035 : 0.01)
        positions[i * 3 + 2] = particleData[i].z + Math.cos(time * 1.7 + i * 0.5) * 0.02
        const isError = state.jammed && i % 7 === 0
        const isOne = state.bit === 1
        colors[i * 3] = isError ? 1 : isOne ? 0.38 : 0.62
        colors[i * 3 + 1] = isError ? 0.34 : isOne ? 0.92 : 0.55
        colors[i * 3 + 2] = isError ? 0.42 : 1
      }
      particleGeometry.attributes.position.needsUpdate = true
      particleGeometry.attributes.color.needsUpdate = true
      particleMaterial.opacity = active ? 0.9 : 0.22

      // Central waveform beam.
      for (let i = 0; i < beamPoints; i += 1) {
        const t = i / (beamPoints - 1)
        const x = -3.05 + t * 6.1
        const wave = Math.sin(t * 30 - time * 4.8) * (active ? 0.07 : 0.018)
        beamPositions[i * 3] = x
        beamPositions[i * 3 + 1] = 1.08 + wave
        beamPositions[i * 3 + 2] = 0
      }
      beamGeometry.attributes.position.needsUpdate = true
      beamMaterial.opacity = active ? 0.5 + Math.sin(time * 3) * 0.12 : 0.12

      // Ambient motion.
      dust.rotation.y = time * 0.006
      orbitalRing.rotation.z = time * 0.03
      orbitalRing2.rotation.z = 0.8 - time * 0.02

      // Billboard labels ride above each node in screen space.
      placeLabel(txLabelRef.current, -3.15, 2.5, 0)
      placeLabel(rxLabelRef.current, 3.15, 2.5, 0)

      renderer.render(scene, camera)
      frame = requestAnimationFrame(render)
    }
    frame = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const material = mesh.material
        if (Array.isArray(material)) material.forEach((entry) => entry.dispose())
        else if (material) material.dispose()
      })
      renderer.dispose()
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement)
    }
  }, [open])

  if (!open) return null

  const fmtKhz = (hz: number) => `${(hz / 1000).toFixed(1).replace(/\.0$/, '')} kHz`
  const phaseText =
    sim.phase === 'idle'
      ? 'STANDBY'
      : sim.phase === 'channel'
        ? `TRANSMITTING SYMBOL ${sim.activeBit + 1}/${sim.packet?.bits.length ?? 0}`
        : sim.phase === 'verifying'
          ? 'CRC VERIFICATION'
          : sim.phase === 'complete'
            ? 'PAYLOAD RECOVERED'
            : sim.phase.toUpperCase()

  return (
    <div className="modal-backdrop three-backdrop" role="dialog" aria-modal="true" aria-label="Orbit 3D laboratory">
      <div className="three-modal">
        <div className="three-modal-head">
          <div>
            <span className="panel-eyebrow">SPATIAL VIEW / WEBGL ORBIT LAB</span>
            <h2>Walk the air gap</h2>
          </div>
          <div className="three-head-actions">
            <span className="three-live"><span className={sim.running ? 'is-live' : ''} /> {phaseText}</span>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close 3D lab">
              <X size={17} />
            </button>
          </div>
        </div>
        <div className="three-stage" ref={mountRef}>
          <div className="three-label tx-label" ref={txLabelRef}>
            <span>TX / 01</span>
            <strong>AIR-GAPPED TRANSMITTER</strong>
            <small>speaker node · {fmtKhz(sim.config.f0)} / {fmtKhz(sim.config.f1)}</small>
          </div>
          <div className="three-label rx-label" ref={rxLabelRef}>
            <span>RX / 02</span>
            <strong>AIR-GAPPED RECEIVER</strong>
            <small>microphone node · {(sim.config.sampleRate / 1000).toFixed(1)} kHz FFT</small>
          </div>
          <div className="three-gap-label">
            <span>PHYSICAL AIR GAP</span>
            <small>no network path</small>
          </div>
          <div className="three-corner-hud top-left">
            <span>LINK</span>
            <strong>{(sim.config.f0 / 1000).toFixed(1)} / {(sim.config.f1 / 1000).toFixed(1)} kHz</strong>
          </div>
          <div className="three-corner-hud top-right">
            <span>MODE</span>
            <strong>FSK-2 / {sim.config.jammer ? 'JAMMED' : 'CLEAR'}</strong>
          </div>
          <div className="three-hint">
            <span><Rotate3d size={13} /> drag to orbit</span>
            <span><ZoomIn size={13} /> scroll to zoom</span>
            <span><Move3d size={13} /> right-drag to pan</span>
          </div>
        </div>
        <div className="three-modal-foot">
          <span><ScanLine size={12} /> Real-time WebGL scene driven by the same simulation state.</span>
          <span>Performance mode: capped pixel ratio · orbit controls</span>
        </div>
      </div>
    </div>
  )
}
