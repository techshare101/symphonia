from typing import Dict, List

class ArcTemplate:
    def __init__(
        self,
        name: str,
        description: str,
        stages: List[str],
        stage_descriptions: Dict[str, str],
        energy_curve: List[float],
        bpm_range: Dict[str, tuple],
        mood_targets: Dict[str, Dict[str, float]],
    ):
        self.name = name
        self.description = description
        self.stages = stages
        self.stage_descriptions = stage_descriptions
        self.energy_curve = energy_curve
        self.bpm_range = bpm_range
        self.mood_targets = mood_targets

# Pre-defined arc templates
TEMPLATES = {
    "club_night": ArcTemplate(
        name="Club Night",
        description="High-energy dance progression for clubs",
        stages=[
            "warmup",
            "build_1",
            "peak_1",
            "groove",
            "build_2",
            "peak_2",
            "cooldown"
        ],
        stage_descriptions={
            "warmup": "Start smooth, establish rhythm (120-124 BPM)",
            "build_1": "Increase energy, introduce stronger beats",
            "peak_1": "First major climax, full energy",
            "groove": "Maintain high energy, focus on groove",
            "build_2": "Second escalation, darker/harder",
            "peak_2": "Maximum energy peak",
            "cooldown": "Gradual energy reduction, maintain mood"
        },
        energy_curve=[0.4, 0.6, 0.9, 0.7, 0.8, 1.0, 0.5],
        bpm_range={
            "warmup": (120, 124),
            "build_1": (124, 128),
            "peak_1": (128, 130),
            "groove": (126, 128),
            "build_2": (128, 132),
            "peak_2": (130, 134),
            "cooldown": (122, 126)
        },
        mood_targets={
            "warmup": {"valence": 0.6, "arousal": 0.4},
            "peak_1": {"valence": 0.8, "arousal": 0.9},
            "peak_2": {"valence": 0.9, "arousal": 1.0}
        }
    ),

    "wedding": ArcTemplate(
        name="Wedding Reception",
        description="Elegant progression from dinner to dance",
        stages=[
            "dinner",
            "first_dance",
            "party_start",
            "dance_floor",
            "slow_moment",
            "finale",
            "last_dance"
        ],
        stage_descriptions={
            "dinner": "Ambient, background music (90-100 BPM)",
            "first_dance": "Romantic, emotional peak",
            "party_start": "Begin upbeat section",
            "dance_floor": "Full party mode",
            "slow_moment": "Emotional slow songs",
            "finale": "High-energy classics",
            "last_dance": "Memorable ending"
        },
        energy_curve=[0.2, 0.4, 0.6, 0.8, 0.5, 0.9, 0.4],
        bpm_range={
            "dinner": (90, 100),
            "first_dance": (60, 80),
            "party_start": (115, 120),
            "dance_floor": (120, 128),
            "slow_moment": (70, 90),
            "finale": (120, 130),
            "last_dance": (60, 80)
        },
        mood_targets={
            "dinner": {"valence": 0.6, "arousal": 0.2},
            "first_dance": {"valence": 0.8, "arousal": 0.4},
            "finale": {"valence": 0.9, "arousal": 0.8}
        }
    ),

    "workout": ArcTemplate(
        name="HIIT Workout",
        description="High-intensity interval training",
        stages=[
            "warmup",
            "hiit_1",
            "recovery_1",
            "hiit_2",
            "recovery_2",
            "final_push",
            "cooldown"
        ],
        stage_descriptions={
            "warmup": "Progressive warmup (120-126 BPM)",
            "hiit_1": "First high intensity interval",
            "recovery_1": "Active recovery period",
            "hiit_2": "Second high intensity interval",
            "recovery_2": "Second recovery period",
            "final_push": "Maximum effort finale",
            "cooldown": "Gradual cooldown"
        },
        energy_curve=[0.4, 0.9, 0.5, 0.95, 0.5, 1.0, 0.3],
        bpm_range={
            "warmup": (120, 126),
            "hiit_1": (140, 150),
            "recovery_1": (125, 130),
            "hiit_2": (145, 155),
            "recovery_2": (125, 130),
            "final_push": (150, 160),
            "cooldown": (100, 120)
        },
        mood_targets={
            "warmup": {"valence": 0.7, "arousal": 0.5},
            "hiit_1": {"valence": 0.8, "arousal": 0.9},
            "final_push": {"valence": 0.9, "arousal": 1.0}
        }
    ),

    "meditation": ArcTemplate(
        name="Meditation Journey",
        description="Deep relaxation and mindfulness",
        stages=[
            "grounding",
            "breath_sync",
            "deep_flow",
            "elevation",
            "transcendence",
            "return",
            "integration"
        ],
        stage_descriptions={
            "grounding": "Earth connection (60-70 BPM)",
            "breath_sync": "Match natural breath rate",
            "deep_flow": "Deep meditative state",
            "elevation": "Gentle energy rise",
            "transcendence": "Peak meditation",
            "return": "Gentle return",
            "integration": "Peaceful closure"
        },
        energy_curve=[0.3, 0.2, 0.1, 0.4, 0.5, 0.3, 0.2],
        bpm_range={
            "grounding": (60, 70),
            "breath_sync": (60, 65),
            "deep_flow": (50, 60),
            "elevation": (65, 75),
            "transcendence": (70, 80),
            "return": (60, 70),
            "integration": (60, 65)
        },
        mood_targets={
            "grounding": {"valence": 0.6, "arousal": 0.3},
            "deep_flow": {"valence": 0.7, "arousal": 0.1},
            "integration": {"valence": 0.8, "arousal": 0.2}
        }
    )
},

    "festival_set": ArcTemplate(
        name="Festival Peak Hour",
        description="High-energy festival set with multiple peak moments",
        stages=[
            "intro",
            "build_tension",
            "peak_1",
            "journey",
            "peak_2",
            "euphoria",
            "closure"
        ],
        stage_descriptions={
            "intro": "Establish festival energy (128-130 BPM)",
            "build_tension": "Create anticipation",
            "peak_1": "First massive drop",
            "journey": "Melodic progression",
            "peak_2": "Second major climax",
            "euphoria": "Pure hands-up moment",
            "closure": "Memorable ending"
        },
        energy_curve=[0.6, 0.8, 1.0, 0.8, 1.0, 0.9, 0.7],
        bpm_range={
            "intro": (128, 130),
            "build_tension": (130, 132),
            "peak_1": (132, 135),
            "journey": (130, 132),
            "peak_2": (134, 138),
            "euphoria": (130, 134),
            "closure": (128, 132)
        },
        mood_targets={
            "intro": {"valence": 0.7, "arousal": 0.6},
            "peak_1": {"valence": 0.9, "arousal": 1.0},
            "euphoria": {"valence": 1.0, "arousal": 0.9}
        }
    ),

    "tech_house": ArcTemplate(
        name="Tech House Journey",
        description="Deep, groovy progression with tech elements",
        stages=[
            "basement",
            "groove_build",
            "tech_peak",
            "deep_dive",
            "acid_groove",
            "warehouse",
            "morning_light"
        ],
        stage_descriptions={
            "basement": "Deep tech vibes (124-126 BPM)",
            "groove_build": "Establish rolling groove",
            "tech_peak": "Technical elements peak",
            "deep_dive": "Underground journey",
            "acid_groove": "Acid-influenced section",
            "warehouse": "Raw warehouse energy",
            "morning_light": "Uplifting closure"
        },
        energy_curve=[0.5, 0.7, 0.9, 0.6, 0.8, 1.0, 0.7],
        bpm_range={
            "basement": (124, 126),
            "groove_build": (125, 127),
            "tech_peak": (127, 129),
            "deep_dive": (126, 128),
            "acid_groove": (127, 129),
            "warehouse": (128, 130),
            "morning_light": (126, 128)
        },
        mood_targets={
            "basement": {"valence": 0.5, "arousal": 0.6},
            "tech_peak": {"valence": 0.7, "arousal": 0.9},
            "warehouse": {"valence": 0.8, "arousal": 1.0}
        }
    ),

    "sunset_beach": ArcTemplate(
        name="Sunset Beach Session",
        description="Melodic house progression for beach sunsets",
        stages=[
            "golden_hour",
            "warm_breeze",
            "sunset_peak",
            "starlight",
            "night_waves",
            "beach_fire",
            "ocean_dreams"
        ],
        stage_descriptions={
            "golden_hour": "Warm, organic start (118-122 BPM)",
            "warm_breeze": "Light, airy progression",
            "sunset_peak": "Sunset celebration",
            "starlight": "Melodic night journey",
            "night_waves": "Deep, rolling grooves",
            "beach_fire": "Intimate moments",
            "ocean_dreams": "Peaceful closure"
        },
        energy_curve=[0.4, 0.6, 0.8, 0.7, 0.6, 0.5, 0.3],
        bpm_range={
            "golden_hour": (118, 122),
            "warm_breeze": (120, 124),
            "sunset_peak": (122, 126),
            "starlight": (121, 125),
            "night_waves": (120, 124),
            "beach_fire": (118, 122),
            "ocean_dreams": (116, 120)
        },
        mood_targets={
            "golden_hour": {"valence": 0.7, "arousal": 0.4},
            "sunset_peak": {"valence": 0.9, "arousal": 0.7},
            "ocean_dreams": {"valence": 0.6, "arousal": 0.3}
        }
    ),

    "afterhours": ArcTemplate(
        name="After Hours Deep",
        description="Deep, hypnotic late-night progression",
        stages=[
            "entrance",
            "hypnotic",
            "deep_tech",
            "minimal",
            "ethereal",
            "sunrise",
            "awakening"
        ],
        stage_descriptions={
            "entrance": "Dark, mysterious entry (122-124 BPM)",
            "hypnotic": "Repetitive, trance-like",
            "deep_tech": "Technical progression",
            "minimal": "Stripped back moments",
            "ethereal": "Dreamlike state",
            "sunrise": "First light vibes",
            "awakening": "Energetic rebirth"
        },
        energy_curve=[0.4, 0.5, 0.7, 0.6, 0.8, 0.9, 1.0],
        bpm_range={
            "entrance": (122, 124),
            "hypnotic": (123, 125),
            "deep_tech": (124, 126),
            "minimal": (123, 125),
            "ethereal": (124, 126),
            "sunrise": (125, 127),
            "awakening": (126, 128)
        },
        mood_targets={
            "entrance": {"valence": 0.4, "arousal": 0.5},
            "ethereal": {"valence": 0.6, "arousal": 0.7},
            "awakening": {"valence": 0.8, "arousal": 0.9}
        }
    )
}
def get_template(name: str) -> ArcTemplate:
    """Get a template by name, raises KeyError if not found"""
    return TEMPLATES[name]

def list_templates() -> List[Dict]:
    """List all available templates with basic info"""
    return [
        {
            "name": t.name,
            "description": t.description,
            "stages": len(t.stages)
        }
        for t in TEMPLATES.values()
    ]