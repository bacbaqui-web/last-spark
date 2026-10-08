LAST SPARK · 야생 로봇 메쉬 시제품 01

선정한 V2 디자인을 바탕으로 제작한 실제 폴리곤 메쉬 5종입니다.

rust-scout          녹슨 척후병: 상자형 외눈, 역관절 두 다리, 팔 기관총
forest-warden       숲의 파수꾼: 중장갑, 파쇄 집게, 파일드라이버
iron-beetle         철갑 딱정벌레: 분할 등껍질, 여섯 다리, 충돌 장갑
wall-sniper-spider  폐허 거미 저격수: 여덟 다리, 접지 패드, 등 위 저격총
assault-mantis      이끼 사마귀 돌격병: 삼각형 외눈, 쌍날, 역관절 하체

파일
- models/*.glb: UV와 색상 텍스처가 내장된 독립형 GLB
- blender/*.blend: 편집 가능한 Blender 5.2 원본. 텍스처를 파일 안에 패킹했습니다.
  Studio_floor, Key, Fill, Rim, Asset_camera는 편집·렌더링용이며 GLB에 포함되지 않습니다.
- textures/material-atlas.png: 내장 image_gen으로 생성한 녹슨 도색·검은 철·녹·이끼 아틀라스
- previews/*.png: 실제 Blender 메쉬 렌더링
- source/create-wild-robots.py: 메쉬 제작·UV·내보내기 스크립트
- metadata/manifest.json: 각 모델의 삼각형 수, 파츠 수, 크기
- metadata/validation.json: GLB 재가져오기 및 텍스처 검증 결과

스케일과 구조
- GLB는 미터 단위이며 Y-up / 정면 +Z입니다.
- 장갑과 관절은 실제 입체 메쉬이며, 이끼 패치와 잎 끝에도 메쉬가 있습니다.
- 파츠별 이름과 회전 기준점을 보존했습니다. 하나의 연결된 유기체형 메쉬는 아닙니다.
- 재질은 베이스 컬러 이미지 + 금속성/거칠기 상수 + 외눈 발광입니다.
- 각 기체의 발광 렌즈 하나만 외눈으로 사용합니다.

현재 단계
디자인 검토용 첫 메쉬 시제품입니다. 원화의 미세한 표면 형상, 스켈레톤 리깅,
전투 애니메이션, 충돌체, LOD 및 게임 내 적 교체는 포함하지 않습니다.
뷰어의 벽면 자세는 배치 확인용이며 벽 타기 AI 또는 애니메이션이 아닙니다.

로컬 미리보기: http://127.0.0.1:5173/wild-robot-lab.html
회전·확대, 메쉬 선, 형태만 보기, 거미 벽면 자세를 지원합니다.

Game integration (2026-10-08)
The five meshes are now used by LAST SPARK ground enemies. Rigid joint hierarchy and procedural idle, locomotion, attack, hit and destruction poses are built by wild-enemy-models.js. GLB and Blender downloads remain the original static meshes; animation is executed by the game, not stored as skeletal clips. Open wild-robot-lab.html to preview the runtime motions.

Mantis arm revision (2026-10-08)
assault-mantis now has 18 rigid mesh assemblies and a real upper-arm > forearm > blade-hand hierarchy in both GLB and Blender. Independent wrist hinges keep the blades pointing downward in the guard and locomotion poses. The game animates an overhead vertical chop. Runtime animation remains separate from the static GLB export.

Weighted locomotion revision (2026-10-08)
The shared game/lab runtime now uses wild-enemy-gait.js for five distinct walk/run profiles: sustained support, longer running strides, coupled pelvis/chassis compression after landing, trailing torso/arms, and stabilized eyes. Insect joints bend about their authored leg planes. Airborne/wall-mounted robots stop cycling their feet. Gait direction follows actual ground travel; the stationary lab previews forward travel. These are procedural poses, not physical ground-contact simulation or embedded GLB animation clips.

Fragment destruction revision (2026-10-08)
wild-enemy-destruction.js breaks the original textured mesh into cached triangle fragments and detachable assemblies. Ballistic debris bounces, accompanied by fire, sparks, cyan electrical arcs and rising smoke. The shared game/lab effect lasts 3.6 seconds; beetle self-detonation uses it too. The lab repeats destruction and can restore the intact model. Fragments are visual effects, with no additional damage or obstacle collision.

Destruction tuning (2026-10-08)
Electrical arcs now flash three times briefly within 0.525 seconds, with completely dark intervals. Reduced lateral/upward impulse, stronger lateral damping and a smaller bounce keep debris close to the body. Fragments accelerate downward at 9.8 m/s² and settle on the support plane.

Directional hit destruction (2026-10-08)
recordImpact captures the lethal hit point and projectile travel direction in world space. Nearby fragments receive a stronger impulse away from the shooter, then fall under the existing gravity and damping. Fire originates at the impact. In the lab, choose 피격 파괴 and click a body part; dragging still orbits the camera. The intact robot restores after playback.

Lethal recoil and delayed breakup (2026-10-08)
The struck assembly kicks back first while the assembled body twists from the hit torque. Pieces detach progressively at 0.32–0.46 seconds, inheriting the rotating body pose and angular velocity. Left and right hits produce opposite torque. Fire and three short electrical discharges start at breakup, at the displaced impact position. Debris gravity is now 4.2 m/s² (previously 9.8), with compact lateral damping and a small landing bounce. This shared runtime is used by both the game and the clickable lab preview.

Joint-following impact revision (2026-10-08)
The new wild-enemy-recoil.js replaces common body recoil with a per-assembly response graph built from the real joint hierarchy. The actual struck mesh moves first; connected assemblies trail its motion with successive damped responses and local joint rotation. Distant feet initially stay put. The graph is re-rooted for head, limb or foot hits. Breakup starts after 0.48 seconds and proceeds along the joint path, inheriting each part's own motion. Gravity remains 4.2 m/s². The lab includes a 0.35x 슬로 모션 button for reviewing the propagation.

Faster, stronger impact tuning (2026-10-08)
Joint-following recoil and breakup now run 1.8x faster. The first breakup begins near 0.27 seconds instead of 0.48. Directional recoil travel is doubled at the corresponding reaction phase; each connected part still trails the struck assembly. Reduced gravity and the brief three-flash electrical effect remain. Actual before/after snapshots of all five meshes verify 2x displacement and 1/1.8 breakup timing.

Breakup during recoil (2026-10-08)
The struck assembly now releases at about 0.078–0.084 seconds while still moving; connected assemblies release at the corresponding moving phase of their own joint response. Fragments retain their sampled pre-break velocity, including its vertical component, and keep travelling in the impact direction. Velocity-dependent lateral drag limits later spread instead of cutting the initial momentum. Tests measure actual fragment positions immediately before and after release to guard against a pause or direction reset.

Intact part detachment and surface landing (2026-10-08)
Mechanical assemblies now detach intact at their joints: heads, torsos, limbs and weapons retain their recognisable shapes, triangles, atlas UVs and surface data. No spatial slicing into small shards is applied. A fixed-step articulated impact response uses joint leverage and assembly mass. Connected parts follow the struck assembly, separating while moving and inheriting the pose and velocity. Rotated assembly bounds determine floor contact, followed by a small bounce, friction and settling onto a stable face. Gravity remains 4.2 m/s². Large explosion flashes have been replaced with a few local sparks, three short, small electrical discharges and light smoke. Main game and lab share this runtime. Debris remains visual only, with no inter-part or obstacle collision.

Hit-local burst and colliding parts (2026-10-08)
The burst now starts immediately at the recorded bullet impact point, instead of the subsequently displaced point. Only the struck assembly receives an extra launch impulse. Other parts inherit the connected joint motion and then exchange momentum through rigid-body contact. New wild-enemy-debris.js uses cannon-es 0.20.0 (MIT, https://github.com/pmndrs/cannon-es) for mass, angular inertia, part collisions, ground friction, rebound and sleeping. Intact assemblies continue rolling after landing. Uniform 1/120-second steps, sub-frame release bridging and cached poses preserve 30/60 fps behavior and backwards seeking. Collision shapes approximate the assembly bounds; interaction is between parts of the same robot and its floor, not world obstacles or other robots. Debris remains visual and deals no additional damage.
Runtime source dependencies: install three and cannon-es@0.20.0 in the consuming JavaScript project. The ZIP includes the new physics module; static GLB files are unchanged.

Connected heavy wreck revision (2026-10-08)
Only the struck assembly detaches at about 0.08 seconds. At 0.1 seconds, the remaining frame enters connected rigid-body simulation and absorbs one local blast impulse. Welded armour and torso attachments share a compound body with combined mass; limbs use limited-angle joints with passive rotational damping. The underlying frame stays connected even when central armour is removed. Floor restitution is reduced from 0.18 to 0.025, and part restitution from 0.1 to 0.015, with higher friction and angular damping. Overlapping connected armour no longer collides with itself. The body tips and settles as a heavy wreck instead of scattering every joint. Generic destruction retains the complete frame. The hit-local small burst, three brief blue flashes, 4.2 m/s² gravity and visual-only collision scope remain.

Accelerating fall revision (2026-10-08)
Severed parts retain the sharp launch but now fall under 14 m/s² gravity rather than 4.2. The remaining connected frame absorbs the initial vertical/rotational jolt and briefly retains actuator support, which fades over about 0.28 seconds after its physics handoff. This gives a slow initial tip followed by accelerating collapse. Upward blast lift on the remaining frame is removed. Low restitution, connected joints and the localized effects remain. New checks cover quick landing, progressive acceleration and consistent 30/60 fps playback.
