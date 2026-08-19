/**
 * RemSkeletalEngine - 156-Bone Forward Kinematics (FK) Rig & Anatomical Mobility Engine
 * Provides realistic joint mobility boundaries, rest quaternion forward kinematics,
 * non-accumulating look-at tracking, and full 3D joint nametag coordinate projection.
 */

const ANATOMICAL_MOBILITY = {
    // Head & Neck
    'DEF-head_07': {
        name: 'Head',
        category: 'head',
        limits: {
            pitch: [-0.42, 0.42], // Nodding up/down (-24° to +24°)
            yaw: [-0.75, 0.75],   // Turning left/right (-43° to +43°)
            roll: [-0.32, 0.32]   // Tilting sideways (-18° to +18°)
        }
    },
    'DEF-neck_06': {
        name: 'Neck',
        category: 'head',
        limits: {
            pitch: [-0.30, 0.30],
            yaw: [-0.55, 0.55],
            roll: [-0.22, 0.22]
        }
    },
    'DEF-LeftEye_08': {
        name: 'Left Eye',
        category: 'eyes',
        limits: { pitch: [-0.25, 0.25], yaw: [-0.35, 0.35], roll: [0, 0] }
    },
    'DEF-RightEye_09': {
        name: 'Right Eye',
        category: 'eyes',
        limits: { pitch: [-0.25, 0.25], yaw: [-0.35, 0.35], roll: [0, 0] }
    },

    // Spine & Core
    'DEF-spine_02': {
        name: 'Pelvis / Root',
        category: 'spine',
        limits: { pitch: [-0.25, 0.35], yaw: [-0.35, 0.35], roll: [-0.20, 0.20] }
    },
    'DEF-spine.001_03': {
        name: 'Lower Spine',
        category: 'spine',
        limits: { pitch: [-0.20, 0.30], yaw: [-0.25, 0.25], roll: [-0.15, 0.15] }
    },
    'DEF-spine.002_04': {
        name: 'Chest / Ribcage',
        category: 'spine',
        limits: { pitch: [-0.20, 0.25], yaw: [-0.25, 0.25], roll: [-0.15, 0.15] }
    },
    'DEF-spine.003_05': {
        name: 'Upper Chest',
        category: 'spine',
        limits: { pitch: [-0.15, 0.20], yaw: [-0.20, 0.20], roll: [-0.10, 0.10] }
    },

    // Left Arm & Hand
    'DEF-shoulder.L_031': {
        name: 'Left Shoulder',
        category: 'left_arm',
        limits: { pitch: [-0.30, 0.40], yaw: [-0.40, 0.40], roll: [-0.30, 0.50] }
    },
    'DEF-upper_arm.L_032': {
        name: 'Left Upper Arm',
        category: 'left_arm',
        limits: { pitch: [-1.80, 1.20], yaw: [-2.20, 0.80], roll: [-1.50, 1.50] }
    },
    'DEF-forearm.L_033': {
        name: 'Left Forearm (Elbow)',
        category: 'left_arm',
        limits: { pitch: [-0.05, 2.45], yaw: [-0.50, 0.50], roll: [-1.20, 1.20] }
    },
    'DEF-hand.L_034': {
        name: 'Left Hand',
        category: 'left_arm',
        limits: { pitch: [-0.80, 0.80], yaw: [-0.60, 0.60], roll: [-0.50, 0.50] }
    },

    // Right Arm & Hand
    'DEF-shoulder.R_061': {
        name: 'Right Shoulder',
        category: 'right_arm',
        limits: { pitch: [-0.30, 0.40], yaw: [-0.40, 0.40], roll: [-0.50, 0.30] }
    },
    'DEF-upper_arm.R_062': {
        name: 'Right Upper Arm',
        category: 'right_arm',
        limits: { pitch: [-1.80, 1.20], yaw: [-0.80, 2.20], roll: [-1.50, 1.50] }
    },
    'DEF-forearm.R_063': {
        name: 'Right Forearm (Elbow)',
        category: 'right_arm',
        limits: { pitch: [-0.05, 2.45], yaw: [-0.50, 0.50], roll: [-1.20, 1.20] }
    },
    'DEF-hand.R_064': {
        name: 'Right Hand',
        category: 'right_arm',
        limits: { pitch: [-0.80, 0.80], yaw: [-0.60, 0.60], roll: [-0.50, 0.50] }
    },

    // Left Leg & Foot
    'DEF-thigh.L_0100': {
        name: 'Left Thigh (Hip)',
        category: 'left_leg',
        limits: { pitch: [-0.80, 1.60], yaw: [-0.50, 0.50], roll: [-0.60, 0.60] }
    },
    'DEF-shin.L_0102': {
        name: 'Left Shin (Knee)',
        category: 'left_leg',
        limits: { pitch: [-2.40, 0.05], yaw: [-0.10, 0.10], roll: [-0.10, 0.10] }
    },
    'DEF-foot.L_0103': {
        name: 'Left Foot',
        category: 'left_leg',
        limits: { pitch: [-0.70, 0.70], yaw: [-0.40, 0.40], roll: [-0.40, 0.40] }
    },

    // Right Leg & Foot
    'DEF-thigh.R_0113': {
        name: 'Right Thigh (Hip)',
        category: 'right_leg',
        limits: { pitch: [-0.80, 1.60], yaw: [-0.50, 0.50], roll: [-0.60, 0.60] }
    },
    'DEF-shin.R_0114': {
        name: 'Right Shin (Knee)',
        category: 'right_leg',
        limits: { pitch: [-2.40, 0.05], yaw: [-0.10, 0.10], roll: [-0.10, 0.10] }
    },
    'DEF-foot.R_0115': {
        name: 'Right Foot',
        category: 'right_leg',
        limits: { pitch: [-0.70, 0.70], yaw: [-0.40, 0.40], roll: [-0.40, 0.40] }
    },

    // Hair & Dress
    'DEF-fronthair1_017': { name: 'Front Bangs L', category: 'hair', limits: { pitch: [-0.25, 0.25], yaw: [-0.25, 0.25], roll: [-0.25, 0.25] } },
    'DEF-fronthair2_016': { name: 'Front Bangs R', category: 'hair', limits: { pitch: [-0.25, 0.25], yaw: [-0.25, 0.25], roll: [-0.25, 0.25] } },
    'DEF-backhair4_018': { name: 'Back Hair', category: 'hair', limits: { pitch: [-0.30, 0.30], yaw: [-0.30, 0.30], roll: [-0.30, 0.30] } },
    'DEF-dress1.L_0109': { name: 'Dress Front L', category: 'dress', limits: { pitch: [-0.40, 0.40], yaw: [-0.30, 0.30], roll: [-0.30, 0.30] } },
    'DEF-dress1.R_0121': { name: 'Dress Front R', category: 'dress', limits: { pitch: [-0.40, 0.40], yaw: [-0.30, 0.30], roll: [-0.30, 0.30] } },
    'DEF-dress3.L_0105': { name: 'Dress Side L', category: 'dress', limits: { pitch: [-0.50, 0.50], yaw: [-0.40, 0.40], roll: [-0.50, 0.50] } },
    'DEF-dress3.R_0117': { name: 'Dress Side R', category: 'dress', limits: { pitch: [-0.50, 0.50], yaw: [-0.40, 0.40], roll: [-0.50, 0.50] } }
};

class RemSkeletalEngine {
    constructor(model) {
        this.model = model;
        this.bones = {};
        this.restQuats = {};
        this.restPositions = {};
        this.enforceMobility = true;
        this.smoothLook = new THREE.Vector2(0, 0);

        // Discover and index all bones
        this.model.traverse((child) => {
            if (child.isBone) {
                this.bones[child.name] = child;
                this.restQuats[child.name] = child.quaternion.clone();
                this.restPositions[child.name] = child.position.clone();
            }
        });

        // Set Base Natural Upright Rest Pose (Cancelling FBX Z-up inversion)
        this.resetToBasePose();
    }

    resetToBasePose() {
        for (const name in this.bones) {
            if (this.restQuats[name]) {
                this.bones[name].quaternion.copy(this.restQuats[name]);
            }
            if (this.restPositions[name]) {
                this.bones[name].position.copy(this.restPositions[name]);
            }
        }
        // Base upright orientation for Pelvis / Root
        if (this.bones['DEF-spine_02']) {
            this.bones['DEF-spine_02'].position.set(0, -0.008197, 0.374479);
            this.bones['DEF-spine_02'].quaternion.set(0.780566, 0, 0, 0.625073);
        }
    }

    // Clamps Euler rotations to anatomical mobility bounds
    clampMobility(boneName, rx, ry, rz) {
        const mob = ANATOMICAL_MOBILITY[boneName];
        if (!mob || !mob.limits || !this.enforceMobility) {
            return { x: rx, y: ry, z: rz };
        }
        const lim = mob.limits;
        const cx = Math.max(lim.pitch[0], Math.min(lim.pitch[1], rx));
        const cy = Math.max(lim.yaw[0], Math.min(lim.yaw[1], ry));
        const cz = Math.max(lim.roll[0], Math.min(lim.roll[1], rz));
        return { x: cx, y: cy, z: cz };
    }

    // Helper to rotate a bone around a local axis relative to its rest pose with mobility clamping
    rotateBone(boneName, axis, angle) {
        const bone = this.bones[boneName];
        const restQ = this.restQuats[boneName];
        if (bone && restQ) {
            let clampedAngle = angle;
            const mob = ANATOMICAL_MOBILITY[boneName];
            if (mob && mob.limits && this.enforceMobility) {
                const limRange = (axis === 'x') ? mob.limits.pitch :
                                 (axis === 'y') ? mob.limits.yaw : mob.limits.roll;
                clampedAngle = Math.max(limRange[0], Math.min(limRange[1], angle));
            }

            const vAxis = (axis === 'x') ? new THREE.Vector3(1, 0, 0) :
                          (axis === 'y') ? new THREE.Vector3(0, 1, 0) :
                                           new THREE.Vector3(0, 0, 1);
            const qDelta = new THREE.Quaternion().setFromAxisAngle(vAxis, clampedAngle);
            bone.quaternion.copy(restQ).multiply(qDelta);
        }
    }

    // Full 3-axis Euler rotation relative to rest pose with mobility limits
    rotateBoneEuler(boneName, rx, ry, rz) {
        const bone = this.bones[boneName];
        const restQ = this.restQuats[boneName];
        if (bone && restQ) {
            const { x, y, z } = this.clampMobility(boneName, rx, ry, rz);
            const qDelta = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'XYZ'));
            bone.quaternion.copy(restQ).multiply(qDelta);
        }
    }

    // Smooth, NON-ACCUMULATING Anatomical Head & Eye Tracking
    applyHeadLookAt(targetMouseX, targetMouseY, damping = 0.08) {
        this.smoothLook.x += (targetMouseX - this.smoothLook.x) * damping;
        this.smoothLook.y += (targetMouseY - this.smoothLook.y) * damping;

        const headMob = ANATOMICAL_MOBILITY['DEF-head_07']?.limits || { yaw: [-0.6, 0.6], pitch: [-0.35, 0.35] };
        const neckMob = ANATOMICAL_MOBILITY['DEF-neck_06']?.limits || { yaw: [-0.4, 0.4], pitch: [-0.2, 0.2] };

        // Head angles: Yaw (turn L/R) and Pitch (nod up/down)
        const targetHeadYaw = THREE.MathUtils.clamp(this.smoothLook.x * 0.45, headMob.yaw[0], headMob.yaw[1]);
        const targetHeadPitch = THREE.MathUtils.clamp(-this.smoothLook.y * 0.28, headMob.pitch[0], headMob.pitch[1]);

        // Neck assists head motion (35% of total angle)
        const targetNeckYaw = THREE.MathUtils.clamp(this.smoothLook.x * 0.20, neckMob.yaw[0], neckMob.yaw[1]);
        const targetNeckPitch = THREE.MathUtils.clamp(-this.smoothLook.y * 0.12, neckMob.pitch[0], neckMob.pitch[1]);

        // Apply clean relative quaternion transforms without mutating baseline
        if (this.bones['DEF-head_07'] && this.restQuats['DEF-head_07']) {
            const qHead = new THREE.Quaternion().setFromEuler(new THREE.Euler(targetHeadPitch, targetHeadYaw, 0, 'YXZ'));
            this.bones['DEF-head_07'].quaternion.copy(this.restQuats['DEF-head_07']).multiply(qHead);
        }

        if (this.bones['DEF-neck_06'] && this.restQuats['DEF-neck_06']) {
            const qNeck = new THREE.Quaternion().setFromEuler(new THREE.Euler(targetNeckPitch, targetNeckYaw, 0, 'YXZ'));
            this.bones['DEF-neck_06'].quaternion.copy(this.restQuats['DEF-neck_06']).multiply(qNeck);
        }

        // Eyes saccade micro-tracking
        const eyeYaw = THREE.MathUtils.clamp(this.smoothLook.x * 0.14, -0.22, 0.22);
        const eyePitch = THREE.MathUtils.clamp(-this.smoothLook.y * 0.10, -0.16, 0.16);

        ['DEF-LeftEye_08', 'DEF-RightEye_09'].forEach(eyeName => {
            if (this.bones[eyeName] && this.restQuats[eyeName]) {
                const qEye = new THREE.Quaternion().setFromEuler(new THREE.Euler(eyePitch, eyeYaw, 0, 'YXZ'));
                this.bones[eyeName].quaternion.copy(this.restQuats[eyeName]).multiply(qEye);
            }
        });
    }

    // Get 3D World Positions for Nametag and Joint Markers
    getJointWorldPositions() {
        const positions = {};
        const v = new THREE.Vector3();

        for (const boneName in ANATOMICAL_MOBILITY) {
            const bone = this.bones[boneName];
            if (bone) {
                bone.getWorldPosition(v);
                positions[boneName] = {
                    name: ANATOMICAL_MOBILITY[boneName].name,
                    category: ANATOMICAL_MOBILITY[boneName].category,
                    pos: v.clone()
                };
            }
        }
        return positions;
    }

    // --- PROCEDURAL ANIMATIONS WITH MOBILITY CONSIDERATIONS ---

    applyIdle(time) {
        this.resetToBasePose();
        const breath = Math.sin(time * 2.5) * 0.03;
        const sway = Math.sin(time * 1.2) * 0.04;

        this.rotateBone('DEF-spine.002_04', 'x', breath * 0.5);
        this.rotateBone('DEF-spine.003_05', 'x', breath * 0.8);
        this.rotateBone('DEF-neck_06', 'z', sway * 0.3);
        this.rotateBone('DEF-head_07', 'z', -sway * 0.35);

        // Soft arm drift
        this.rotateBone('DEF-upper_arm.L_032', 'y', -0.15 + breath * 0.2);
        this.rotateBone('DEF-upper_arm.R_062', 'y', 0.15 - breath * 0.2);

        // Skirt gentle physics
        this.rotateBone('DEF-dress1.L_0109', 'x', breath * 0.2);
        this.rotateBone('DEF-dress1.R_0121', 'x', breath * 0.2);
    }

    applyCheer(time) {
        this.resetToBasePose();
        const jump = Math.abs(Math.sin(time * 6));
        const armWave = Math.sin(time * 12) * 0.15;

        // Lift both arms high into V-shape within safe mobility
        this.rotateBone('DEF-shoulder.L_031', 'z', 0.25);
        this.rotateBone('DEF-shoulder.R_061', 'z', -0.25);
        this.rotateBone('DEF-upper_arm.L_032', 'y', -1.75 + armWave);
        this.rotateBone('DEF-upper_arm.R_062', 'y', 1.75 - armWave);
        this.rotateBone('DEF-forearm.L_033', 'x', 0.35);
        this.rotateBone('DEF-forearm.R_063', 'x', 0.35);

        this.rotateBone('DEF-head_07', 'x', -0.20);
        this.rotateBone('DEF-spine.003_05', 'x', 0.12);

        this.model.position.y = jump * 0.15;
    }

    applyKarate(time) {
        this.resetToBasePose();
        const cycle = (time * 4) % (Math.PI * 2);

        if (cycle < Math.PI) {
            const punch = Math.sin(cycle * 2);
            this.rotateBone('DEF-upper_arm.R_062', 'y', 1.1 + punch * 0.6);
            this.rotateBone('DEF-forearm.R_063', 'x', 0.25);
            this.rotateBone('DEF-upper_arm.L_032', 'y', -0.5);
            this.rotateBone('DEF-forearm.L_033', 'x', 1.1);
            this.rotateBone('DEF-spine_02', 'z', punch * 0.20);
        } else {
            const kick = Math.sin(cycle - Math.PI);
            this.rotateBone('DEF-thigh.R_0113', 'x', 1.35 * kick);
            this.rotateBone('DEF-shin.R_0114', 'x', -0.35 * kick);
            this.rotateBone('DEF-upper_arm.L_032', 'y', -1.2 * kick);
            this.rotateBone('DEF-upper_arm.R_062', 'y', 1.2 * kick);
            this.model.position.y = kick * 0.10;
        }
    }

    applyGuitar(time) {
        this.resetToBasePose();
        const strum = Math.sin(time * 18) * 0.35;
        const headbang = Math.abs(Math.sin(time * 8)) * 0.35;

        this.rotateBone('DEF-upper_arm.L_032', 'y', -1.1);
        this.rotateBone('DEF-forearm.L_033', 'x', 1.35);
        this.rotateBone('DEF-hand.L_034', 'z', 0.4);

        this.rotateBone('DEF-upper_arm.R_062', 'y', 0.5 + strum);
        this.rotateBone('DEF-forearm.R_063', 'x', 1.1 + strum * 0.4);

        this.rotateBone('DEF-head_07', 'x', headbang);
        this.rotateBone('DEF-spine.002_04', 'x', headbang * 0.3);

        this.rotateBone('DEF-thigh.L_0100', 'z', 0.25);
        this.rotateBone('DEF-thigh.R_0113', 'z', -0.25);
    }

    applyBackflip(time) {
        this.resetToBasePose();
        const p = (time % 1.2) / 1.2;
        const angle = p * Math.PI * 2;
        const jumpH = Math.sin(p * Math.PI) * 0.35;

        this.model.rotation.x = -angle;
        this.model.position.y = jumpH;

        this.rotateBone('DEF-thigh.L_0100', 'x', 1.1);
        this.rotateBone('DEF-thigh.R_0113', 'x', 1.1);
        this.rotateBone('DEF-shin.L_0102', 'x', -1.1);
        this.rotateBone('DEF-shin.R_0114', 'x', -1.1);
        this.rotateBone('DEF-upper_arm.L_032', 'y', -1.1);
        this.rotateBone('DEF-upper_arm.R_062', 'y', 1.1);
    }

    applyNeko(time) {
        this.resetToBasePose();
        const wave = Math.sin(time * 6);
        const paw = Math.sin(time * 12) * 0.18;

        this.rotateBone('DEF-upper_arm.L_032', 'y', -1.1 + wave * 0.25);
        this.rotateBone('DEF-upper_arm.R_062', 'y', 1.1 - wave * 0.25);
        this.rotateBone('DEF-forearm.L_033', 'x', 1.3 + paw);
        this.rotateBone('DEF-forearm.R_063', 'x', 1.3 - paw);

        this.rotateBone('DEF-spine_02', 'z', wave * 0.15);
        this.rotateBone('DEF-head_07', 'z', -wave * 0.20);
        this.model.position.x = wave * 0.12;
        this.model.position.y = Math.abs(Math.sin(time * 12)) * 0.04;
    }

    applyMagic(time) {
        this.resetToBasePose();
        const swirl = Math.sin(time * 8);

        this.rotateBone('DEF-upper_arm.L_032', 'y', -1.3 + swirl * 0.25);
        this.rotateBone('DEF-upper_arm.R_062', 'y', 1.3 - swirl * 0.25);
        this.rotateBone('DEF-forearm.L_033', 'x', 1.15);
        this.rotateBone('DEF-forearm.R_063', 'x', 1.15);

        this.model.position.y = Math.sin(time * 6) * 0.07 + 0.05;
    }

    applyCurtsy(time) {
        this.resetToBasePose();
        const p = Math.sin(Math.min(time * 2, Math.PI));

        this.rotateBone('DEF-upper_arm.L_032', 'z', -0.45 * p);
        this.rotateBone('DEF-upper_arm.R_062', 'z', 0.45 * p);
        this.rotateBone('DEF-dress3.L_0105', 'z', -0.35 * p);
        this.rotateBone('DEF-dress3.R_0117', 'z', 0.35 * p);

        this.rotateBone('DEF-thigh.L_0100', 'x', 0.30 * p);
        this.rotateBone('DEF-thigh.R_0113', 'x', -0.30 * p);
        this.rotateBone('DEF-head_07', 'x', 0.18 * p);
        this.model.position.y = -0.08 * p;
    }

    applyTea(time) {
        this.resetToBasePose();
        const bow = Math.sin(Math.min(time * 2, Math.PI));

        this.rotateBone('DEF-spine.001_03', 'x', 0.5 * bow);
        this.rotateBone('DEF-head_07', 'x', -0.3 * bow);
        this.rotateBone('DEF-upper_arm.L_032', 'y', -0.35 * bow);
        this.rotateBone('DEF-upper_arm.R_062', 'y', 0.35 * bow);
        this.rotateBone('DEF-forearm.L_033', 'x', 1.1 * bow);
        this.rotateBone('DEF-forearm.R_063', 'x', 1.1 * bow);
        this.model.position.y = -0.05 * bow;
    }

    applyRocket(time) {
        this.resetToBasePose();
        const launchY = Math.max(0, Math.sin(time * 4) * 0.35);

        this.rotateBone('DEF-upper_arm.L_032', 'y', -2.2);
        this.rotateBone('DEF-upper_arm.R_062', 'y', 2.2);
        this.rotateBone('DEF-head_07', 'x', -0.25);
        this.model.position.y = launchY;
    }

    applyTornado(time) {
        this.resetToBasePose();
        this.rotateBone('DEF-upper_arm.L_032', 'y', -1.4);
        this.rotateBone('DEF-upper_arm.R_062', 'y', 1.4);
        this.model.rotation.y += 0.25;
        this.model.position.y = Math.sin(time * 12) * 0.05;
    }

    applyMeditate(time) {
        this.resetToBasePose();
        const floatY = Math.sin(time * 3) * 0.07 + 0.10;

        this.rotateBone('DEF-thigh.L_0100', 'x', 1.3);
        this.rotateBone('DEF-thigh.R_0113', 'x', 1.3);
        this.rotateBone('DEF-shin.L_0102', 'x', -1.1);
        this.rotateBone('DEF-shin.R_0114', 'x', -1.1);

        this.rotateBone('DEF-upper_arm.L_032', 'y', -0.45);
        this.rotateBone('DEF-upper_arm.R_062', 'y', 0.45);
        this.rotateBone('DEF-forearm.L_033', 'x', 1.3);
        this.rotateBone('DEF-forearm.R_063', 'x', 1.3);

        this.model.position.y = floatY;
    }

    update(actionName, time) {
        const act = actionName.toLowerCase();
        switch (act) {
            case 'cheer':
            case 'victorycheer':
            case 'excited':
                this.applyCheer(time); break;
            case 'karate':
                this.applyKarate(time); break;
            case 'guitar':
                this.applyGuitar(time); break;
            case 'backflip':
                this.applyBackflip(time); break;
            case 'neko':
            case 'dance':
                this.applyNeko(time); break;
            case 'magic':
                this.applyMagic(time); break;
            case 'curtsy':
                this.applyCurtsy(time); break;
            case 'tea':
                this.applyTea(time); break;
            case 'rocket':
                this.applyRocket(time); break;
            case 'tornado':
                this.applyTornado(time); break;
            case 'meditate':
                this.applyMeditate(time); break;
            default:
                this.applyIdle(time); break;
        }
    }
}

if (typeof window !== 'undefined') {
    window.ANATOMICAL_MOBILITY = ANATOMICAL_MOBILITY;
    window.RemSkeletalEngine = RemSkeletalEngine;
}
